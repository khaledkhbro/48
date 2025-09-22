"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AgentManagementDashboard } from "@/components/admin/agent-management-dashboard"
import {
  Search,
  Filter,
  Plus,
  UserCheck,
  MessageSquare,
  Edit,
  Trash2,
  Eye,
  Activity,
  Users,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  BarChart3,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface Agent {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
  status: "available" | "busy" | "offline"
  isOnline: boolean
  activeSessions: number
  maxConcurrentChats: number
  totalMessages: number
  avgResponseTime: string
  satisfactionScore: number
  totalResolved: number
  joinedAt: Date
  lastActive: Date
  department: string
  skills: string[]
  languages: string[]
  performance: {
    thisWeek: {
      messages: number
      resolved: number
      avgResponse: string
      satisfaction: number
    }
    thisMonth: {
      messages: number
      resolved: number
      avgResponse: string
      satisfaction: number
    }
  }
}

// Mock data for demonstration
const mockAgents: Agent[] = [
  {
    id: "agent1",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah@marketplace.com",
    status: "available",
    isOnline: true,
    activeSessions: 3,
    maxConcurrentChats: 5,
    totalMessages: 1247,
    avgResponseTime: "1.8 min",
    satisfactionScore: 4.9,
    totalResolved: 342,
    joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    lastActive: new Date(Date.now() - 5 * 60 * 1000),
    department: "General Support",
    skills: ["Customer Service", "Technical Support", "Billing"],
    languages: ["English", "Spanish"],
    performance: {
      thisWeek: { messages: 156, resolved: 42, avgResponse: "1.6 min", satisfaction: 4.8 },
      thisMonth: { messages: 687, resolved: 189, avgResponse: "1.8 min", satisfaction: 4.9 },
    },
  },
  {
    id: "agent2",
    firstName: "Mike",
    lastName: "Chen",
    email: "mike@marketplace.com",
    status: "busy",
    isOnline: true,
    activeSessions: 5,
    maxConcurrentChats: 5,
    totalMessages: 892,
    avgResponseTime: "2.1 min",
    satisfactionScore: 4.7,
    totalResolved: 234,
    joinedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    lastActive: new Date(Date.now() - 2 * 60 * 1000),
    department: "Technical Support",
    skills: ["Technical Support", "API Integration", "Troubleshooting"],
    languages: ["English", "Mandarin"],
    performance: {
      thisWeek: { messages: 134, resolved: 38, avgResponse: "2.0 min", satisfaction: 4.6 },
      thisMonth: { messages: 523, resolved: 145, avgResponse: "2.1 min", satisfaction: 4.7 },
    },
  },
  {
    id: "agent3",
    firstName: "Emma",
    lastName: "Davis",
    email: "emma@marketplace.com",
    status: "offline",
    isOnline: false,
    activeSessions: 0,
    maxConcurrentChats: 4,
    totalMessages: 654,
    avgResponseTime: "2.5 min",
    satisfactionScore: 4.6,
    totalResolved: 178,
    joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lastActive: new Date(Date.now() - 8 * 60 * 60 * 1000),
    department: "Billing Support",
    skills: ["Billing", "Payments", "Refunds"],
    languages: ["English", "French"],
    performance: {
      thisWeek: { messages: 89, resolved: 24, avgResponse: "2.3 min", satisfaction: 4.5 },
      thisMonth: { messages: 378, resolved: 98, avgResponse: "2.5 min", satisfaction: 4.6 },
    },
  },
]

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [activeView, setActiveView] = useState<"dashboard" | "management">("dashboard")
  const [newAgent, setNewAgent] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    maxConcurrentChats: 5,
    skills: "",
    languages: "",
  })

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      searchQuery === "" ||
      agent.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.department.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || agent.status === statusFilter
    const matchesDepartment = departmentFilter === "all" || agent.department === departmentFilter

    return matchesSearch && matchesStatus && matchesDepartment
  })

  const getStatusBadge = (status: Agent["status"], isOnline: boolean) => {
    if (!isOnline) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Offline
        </Badge>
      )
    }

    switch (status) {
      case "available":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Available
          </Badge>
        )
      case "busy":
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Busy
          </Badge>
        )
      case "offline":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Offline
          </Badge>
        )
    }
  }

  const handleCreateAgent = async () => {
    try {
      // In real app, this would be an API call
      const agent: Agent = {
        id: `agent${agents.length + 1}`,
        firstName: newAgent.firstName,
        lastName: newAgent.lastName,
        email: newAgent.email,
        status: "offline",
        isOnline: false,
        activeSessions: 0,
        maxConcurrentChats: newAgent.maxConcurrentChats,
        totalMessages: 0,
        avgResponseTime: "0 min",
        satisfactionScore: 0,
        totalResolved: 0,
        joinedAt: new Date(),
        lastActive: new Date(),
        department: newAgent.department,
        skills: newAgent.skills.split(",").map((s) => s.trim()),
        languages: newAgent.languages.split(",").map((l) => l.trim()),
        performance: {
          thisWeek: { messages: 0, resolved: 0, avgResponse: "0 min", satisfaction: 0 },
          thisMonth: { messages: 0, resolved: 0, avgResponse: "0 min", satisfaction: 0 },
        },
      }

      setAgents((prev) => [...prev, agent])
      setShowCreateDialog(false)
      setNewAgent({
        firstName: "",
        lastName: "",
        email: "",
        department: "",
        maxConcurrentChats: 5,
        skills: "",
        languages: "",
      })
      toast.success("Agent created successfully!")
    } catch (error) {
      console.error("Error creating agent:", error)
      toast.error("Failed to create agent")
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    try {
      setAgents((prev) => prev.filter((agent) => agent.id !== agentId))
      toast.success("Agent deleted successfully!")
    } catch (error) {
      console.error("Error deleting agent:", error)
      toast.error("Failed to delete agent")
    }
  }

  const handleStatusChange = async (agentId: string, newStatus: Agent["status"]) => {
    try {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                status: newStatus,
                isOnline: newStatus !== "offline",
                lastActive: new Date(),
              }
            : agent,
        ),
      )
      toast.success(`Agent status updated to ${newStatus}`)
    } catch (error) {
      console.error("Error updating agent status:", error)
      toast.error("Failed to update agent status")
    }
  }

  // Statistics
  const stats = {
    total: agents.length,
    online: agents.filter((a) => a.isOnline).length,
    available: agents.filter((a) => a.status === "available" && a.isOnline).length,
    busy: agents.filter((a) => a.status === "busy" && a.isOnline).length,
    totalSessions: agents.reduce((sum, a) => sum + a.activeSessions, 0),
    avgSatisfaction: agents.reduce((sum, a) => sum + a.satisfactionScore, 0) / agents.length,
  }

  return (
    <>
      <AdminHeader title="Agent Management" description="Manage support agents and monitor performance" />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "dashboard" | "management")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dashboard" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Dashboard & Analytics
                  </TabsTrigger>
                  <TabsTrigger value="management" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Agent Management
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {activeView === "dashboard" ? (
            <AgentManagementDashboard />
          ) : (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Online</CardTitle>
                    <Activity className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.online}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Busy</CardTitle>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{stats.busy}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalSessions}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
                    <Star className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{stats.avgSatisfaction.toFixed(1)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Agents Management */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <CardTitle>Support Agents</CardTitle>

                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Agent
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create New Agent</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="firstName">First Name</Label>
                              <Input
                                id="firstName"
                                value={newAgent.firstName}
                                onChange={(e) => setNewAgent((prev) => ({ ...prev, firstName: e.target.value }))}
                                placeholder="John"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastName">Last Name</Label>
                              <Input
                                id="lastName"
                                value={newAgent.lastName}
                                onChange={(e) => setNewAgent((prev) => ({ ...prev, lastName: e.target.value }))}
                                placeholder="Doe"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newAgent.email}
                              onChange={(e) => setNewAgent((prev) => ({ ...prev, email: e.target.value }))}
                              placeholder="john@marketplace.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Select
                              value={newAgent.department}
                              onValueChange={(value) => setNewAgent((prev) => ({ ...prev, department: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="General Support">General Support</SelectItem>
                                <SelectItem value="Technical Support">Technical Support</SelectItem>
                                <SelectItem value="Billing Support">Billing Support</SelectItem>
                                <SelectItem value="Sales Support">Sales Support</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="maxChats">Max Concurrent Chats</Label>
                            <Input
                              id="maxChats"
                              type="number"
                              min="1"
                              max="10"
                              value={newAgent.maxConcurrentChats}
                              onChange={(e) =>
                                setNewAgent((prev) => ({
                                  ...prev,
                                  maxConcurrentChats: Number.parseInt(e.target.value),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="skills">Skills (comma-separated)</Label>
                            <Input
                              id="skills"
                              value={newAgent.skills}
                              onChange={(e) => setNewAgent((prev) => ({ ...prev, skills: e.target.value }))}
                              placeholder="Customer Service, Technical Support"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="languages">Languages (comma-separated)</Label>
                            <Input
                              id="languages"
                              value={newAgent.languages}
                              onChange={(e) => setNewAgent((prev) => ({ ...prev, languages: e.target.value }))}
                              placeholder="English, Spanish"
                            />
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateAgent}>Create Agent</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search agents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="General Support">General Support</SelectItem>
                        <SelectItem value="Technical Support">Technical Support</SelectItem>
                        <SelectItem value="Billing Support">Billing Support</SelectItem>
                        <SelectItem value="Sales Support">Sales Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agents Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Sessions</TableHead>
                          <TableHead>Performance</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAgents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="flex flex-col items-center">
                                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No agents found</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAgents.map((agent) => (
                            <TableRow key={agent.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={agent.avatar || "/placeholder.svg"} />
                                    <AvatarFallback>
                                      {agent.firstName[0]}
                                      {agent.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">
                                      {agent.firstName} {agent.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {getStatusBadge(agent.status, agent.isOnline)}
                                  <Select
                                    value={agent.status}
                                    onValueChange={(value: Agent["status"]) => handleStatusChange(agent.id, value)}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="available">Available</SelectItem>
                                      <SelectItem value="busy">Busy</SelectItem>
                                      <SelectItem value="offline">Offline</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{agent.department}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {agent.activeSessions}/{agent.maxConcurrentChats}
                                  </div>
                                  <Progress
                                    value={(agent.activeSessions / agent.maxConcurrentChats) * 100}
                                    className="w-16 h-2 mt-1"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    <span>{agent.satisfactionScore.toFixed(1)}</span>
                                  </div>
                                  <div className="text-muted-foreground">{agent.avgResponseTime}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(agent.lastActive, { addSuffix: true })}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setSelectedAgent(agent)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAgent(agent)
                                      setShowEditDialog(true)
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeleteAgent(agent.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Agent Details Dialog */}
      <Dialog open={!!selectedAgent && !showEditDialog} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedAgent?.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {selectedAgent?.firstName[0]}
                  {selectedAgent?.lastName[0]}
                </AvatarFallback>
              </Avatar>
              Agent Details: {selectedAgent?.firstName} {selectedAgent?.lastName}
            </DialogTitle>
          </DialogHeader>

          {selectedAgent && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{selectedAgent.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Department:</span>
                        <Badge variant="outline">{selectedAgent.department}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        {getStatusBadge(selectedAgent.status, selectedAgent.isOnline)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Joined:</span>
                        <span className="text-sm">
                          {formatDistanceToNow(selectedAgent.joinedAt, { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Current Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Active Sessions:</span>
                        <span className="text-sm font-bold">
                          {selectedAgent.activeSessions}/{selectedAgent.maxConcurrentChats}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total Messages:</span>
                        <span className="text-sm">{selectedAgent.totalMessages.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Avg Response:</span>
                        <span className="text-sm">{selectedAgent.avgResponseTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Satisfaction:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{selectedAgent.satisfactionScore.toFixed(1)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Languages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.languages.map((language, index) => (
                          <Badge key={index} variant="outline">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">This Week</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Messages:</span>
                        <span className="text-sm font-bold">{selectedAgent.performance.thisWeek.messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Resolved:</span>
                        <span className="text-sm font-bold">{selectedAgent.performance.thisWeek.resolved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Avg Response:</span>
                        <span className="text-sm">{selectedAgent.performance.thisWeek.avgResponse}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Satisfaction:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {selectedAgent.performance.thisWeek.satisfaction.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">This Month</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Messages:</span>
                        <span className="text-sm font-bold">{selectedAgent.performance.thisMonth.messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Resolved:</span>
                        <span className="text-sm font-bold">{selectedAgent.performance.thisMonth.resolved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Avg Response:</span>
                        <span className="text-sm">{selectedAgent.performance.thisMonth.avgResponse}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Satisfaction:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {selectedAgent.performance.thisMonth.satisfaction.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Agent Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Max Concurrent Chats</Label>
                        <Input type="number" value={selectedAgent.maxConcurrentChats} min="1" max="10" />
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={selectedAgent.department}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General Support">General Support</SelectItem>
                            <SelectItem value="Technical Support">Technical Support</SelectItem>
                            <SelectItem value="Billing Support">Billing Support</SelectItem>
                            <SelectItem value="Sales Support">Sales Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Skills</Label>
                      <Input value={selectedAgent.skills.join(", ")} />
                    </div>

                    <div className="space-y-2">
                      <Label>Languages</Label>
                      <Input value={selectedAgent.languages.join(", ")} />
                    </div>

                    <div className="flex justify-end">
                      <Button>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
