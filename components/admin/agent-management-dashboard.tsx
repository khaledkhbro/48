"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Settings,
  Star,
  Phone,
  Mail,
  Shield,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react"
import { getAllUsers, updateAgentStatus, updateUser } from "@/lib/auth"
import type { User as AuthUser } from "@/lib/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AgentPerformance {
  agentId: string
  agentName: string
  totalChats: number
  resolvedChats: number
  averageResponseTime: number
  customerRating: number
  activeChats: number
  status: "available" | "busy" | "offline"
}

export function AgentManagementDashboard() {
  const [agents, setAgents] = useState<AuthUser[]>([])
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AuthUser | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAgents()
    loadAgentPerformance()
  }, [])

  const loadAgents = () => {
    const allUsers = getAllUsers()
    const agentUsers = allUsers.filter((user) => user.userType === "agent")
    setAgents(agentUsers)
    setIsLoading(false)
  }

  const loadAgentPerformance = () => {
    // Mock performance data - in real app, this would come from your database
    const mockPerformance: AgentPerformance[] = [
      {
        agentId: "02",
        agentName: "Sarah Agent",
        totalChats: 156,
        resolvedChats: 142,
        averageResponseTime: 2.3,
        customerRating: 4.8,
        activeChats: 3,
        status: "available",
      },
      {
        agentId: "03",
        agentName: "Mike Support",
        totalChats: 89,
        resolvedChats: 81,
        averageResponseTime: 3.1,
        customerRating: 4.6,
        activeChats: 1,
        status: "available",
      },
    ]
    setAgentPerformance(mockPerformance)
  }

  const handleStatusChange = (agentId: string, newStatus: "available" | "busy" | "offline") => {
    updateAgentStatus(agentId, newStatus)
    setAgents((prev) => prev.map((agent) => (agent.id === agentId ? { ...agent, agentStatus: newStatus } : agent)))
  }

  const handleEditAgent = (agent: AuthUser) => {
    setSelectedAgent(agent)
  }

  const handleSaveAgent = (updatedAgent: Partial<AuthUser>) => {
    if (selectedAgent) {
      const updated = updateUser(selectedAgent.id, updatedAgent)
      setAgents((prev) => prev.map((agent) => (agent.id === selectedAgent.id ? updated : agent)))
      setSelectedAgent(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Available
          </Badge>
        )
      case "busy":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Busy
          </Badge>
        )
      case "offline":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        )
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || agent.agentStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    totalAgents: agents.length,
    availableAgents: agents.filter((a) => a.agentStatus === "available").length,
    busyAgents: agents.filter((a) => a.agentStatus === "busy").length,
    offlineAgents: agents.filter((a) => a.agentStatus === "offline").length,
    totalActiveChats: agentPerformance.reduce((sum, perf) => sum + perf.activeChats, 0),
    averageRating: agentPerformance.reduce((sum, perf) => sum + perf.customerRating, 0) / agentPerformance.length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-900">{stats.availableAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Chats</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActiveChats}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Management Interface */}
      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">Agent List</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
          </div>

          {/* Agent List */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Management</CardTitle>
              <CardDescription>Manage your support agents and their status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="p-4 font-medium">Agent</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Active Chats</th>
                      <th className="p-4 font-medium">Max Chats</th>
                      <th className="p-4 font-medium">Contact</th>
                      <th className="p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : filteredAgents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          No agents found
                        </td>
                      </tr>
                    ) : (
                      filteredAgents.map((agent) => (
                        <tr key={agent.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                  {agent.firstName[0]}
                                  {agent.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {agent.firstName} {agent.lastName}
                                </div>
                                <div className="text-sm text-gray-500">ID: {agent.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Select
                              value={agent.agentStatus || "offline"}
                              onValueChange={(value) => handleStatusChange(agent.id, value as any)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="busy">Busy</SelectItem>
                                <SelectItem value="offline">Offline</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">{agent.currentChatCount || 0}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{agent.maxConcurrentChats || 5}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Phone className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditAgent(agent)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Agent
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Shield className="w-4 h-4 mr-2" />
                                  View Permissions
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Agent
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {agentPerformance.map((perf) => (
              <Card key={perf.agentId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{perf.agentName}</span>
                    {getStatusBadge(perf.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{perf.totalChats}</div>
                      <div className="text-sm text-blue-700">Total Chats</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{perf.resolvedChats}</div>
                      <div className="text-sm text-green-700">Resolved</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Response Time</span>
                      <Badge variant="secondary">{perf.averageResponseTime}min avg</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Customer Rating</span>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="font-medium">{perf.customerRating}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Resolution Rate</span>
                      <Badge className="bg-green-100 text-green-800">
                        {Math.round((perf.resolvedChats / perf.totalChats) * 100)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent System Settings</CardTitle>
              <CardDescription>Configure global agent management settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Chat Assignment</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-assign chats</span>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Max concurrent chats</span>
                      <Badge variant="secondary">5 per agent</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Assignment method</span>
                      <Badge variant="outline">Round Robin</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Performance Tracking</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Response time tracking</span>
                      <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Customer ratings</span>
                      <Badge className="bg-purple-100 text-purple-800">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Performance reports</span>
                      <Badge variant="secondary">Weekly</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Update Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
