"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  Bell,
  TrendingUp,
  Zap,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface SupportMetrics {
  activeTickets: number
  pendingTickets: number
  resolvedToday: number
  avgResponseTime: string
  agentsOnline: number
  activeSessions: number
  satisfactionScore: number
  queueLength: number
}

interface LiveActivity {
  id: string
  type: "ticket_created" | "ticket_resolved" | "agent_joined" | "chat_started" | "message_sent"
  message: string
  timestamp: Date
  priority: "low" | "normal" | "high" | "urgent"
  agentId?: string
  ticketId?: string
  sessionId?: string
}

interface AgentStatus {
  id: string
  name: string
  status: "available" | "busy" | "offline"
  activeSessions: number
  maxSessions: number
  avgResponseTime: string
  lastActivity: Date
}

export function RealTimeSupportDashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<SupportMetrics>({
    activeTickets: 12,
    pendingTickets: 5,
    resolvedToday: 28,
    avgResponseTime: "2.3 min",
    agentsOnline: 3,
    activeSessions: 8,
    satisfactionScore: 4.7,
    queueLength: 3,
  })

  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([
    {
      id: "1",
      type: "ticket_created",
      message: "New priority support ticket created by John Doe",
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      priority: "high",
      ticketId: "ticket_123",
    },
    {
      id: "2",
      type: "agent_joined",
      message: "Agent Sarah Johnson came online",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      priority: "normal",
      agentId: "agent_1",
    },
    {
      id: "3",
      type: "chat_started",
      message: "New anonymous chat session started",
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      priority: "normal",
      sessionId: "session_456",
    },
  ])

  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([
    {
      id: "agent_1",
      name: "Sarah Johnson",
      status: "available",
      activeSessions: 2,
      maxSessions: 5,
      avgResponseTime: "1.8 min",
      lastActivity: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
      id: "agent_2",
      name: "Mike Chen",
      status: "busy",
      activeSessions: 5,
      maxSessions: 5,
      avgResponseTime: "2.1 min",
      lastActivity: new Date(Date.now() - 1 * 60 * 1000),
    },
    {
      id: "agent_3",
      name: "Emma Davis",
      status: "offline",
      activeSessions: 0,
      maxSessions: 4,
      avgResponseTime: "2.5 min",
      lastActivity: new Date(Date.now() - 30 * 60 * 1000),
    },
  ])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    const fetchRealTimeData = async () => {
      try {
        // Simulate real-time updates
        setMetrics((prev) => ({
          ...prev,
          activeTickets: prev.activeTickets + Math.floor(Math.random() * 3) - 1,
          activeSessions: Math.max(0, prev.activeSessions + Math.floor(Math.random() * 3) - 1),
          queueLength: Math.max(0, prev.queueLength + Math.floor(Math.random() * 2) - 1),
        }))

        // Simulate new activity
        if (Math.random() > 0.7) {
          const activities = [
            "New support ticket created",
            "Chat session resolved",
            "Agent response sent",
            "Priority ticket escalated",
          ]
          const newActivity: LiveActivity = {
            id: Date.now().toString(),
            type: "message_sent",
            message: activities[Math.floor(Math.random() * activities.length)],
            timestamp: new Date(),
            priority: Math.random() > 0.8 ? "high" : "normal",
          }

          setLiveActivity((prev) => [newActivity, ...prev.slice(0, 9)])
        }

        setLastUpdate(new Date())
      } catch (error) {
        console.error("[v0] Error fetching real-time data:", error)
      }
    }

    const interval = setInterval(fetchRealTimeData, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("Dashboard refreshed")
    } catch (error) {
      toast.error("Failed to refresh dashboard")
    } finally {
      setIsRefreshing(false)
    }
  }

  const getActivityIcon = (type: LiveActivity["type"]) => {
    switch (type) {
      case "ticket_created":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "ticket_resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "agent_joined":
        return <Users className="h-4 w-4 text-blue-600" />
      case "chat_started":
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case "message_sent":
        return <MessageSquare className="h-4 w-4 text-gray-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: LiveActivity["priority"]) => {
    switch (priority) {
      case "urgent":
        return "text-red-600"
      case "high":
        return "text-orange-600"
      case "normal":
        return "text-blue-600"
      case "low":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusBadge = (status: AgentStatus["status"]) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800">Available</Badge>
      case "busy":
        return <Badge className="bg-yellow-100 text-yellow-800">Busy</Badge>
      case "offline":
        return <Badge variant="secondary">Offline</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with real-time indicator */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Support Dashboard</h2>
          <p className="text-gray-600 flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600 animate-pulse" />
            Live updates • Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Real-time metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeTickets}</div>
            <p className="text-xs text-muted-foreground">{metrics.pendingTickets} pending response</p>
            <div className="flex items-center mt-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-xs text-orange-600">Live</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Length</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.queueLength}</div>
            <p className="text-xs text-muted-foreground">Avg wait: {metrics.avgResponseTime}</p>
            <Progress value={(metrics.queueLength / 10) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents Online</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.agentsOnline}</div>
            <p className="text-xs text-muted-foreground">{metrics.activeSessions} active sessions</p>
            <div className="flex items-center mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-xs text-green-600">Online</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.satisfactionScore}/5.0</div>
            <p className="text-xs text-muted-foreground">{metrics.resolvedToday} resolved today</p>
            <Progress value={(metrics.satisfactionScore / 5) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Live Activity</TabsTrigger>
          <TabsTrigger value="agents">Agent Status</TabsTrigger>
          <TabsTrigger value="alerts">System Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Activity Feed
                <Badge variant="outline" className="ml-auto">
                  {liveActivity.length} events
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {liveActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card/50">
                      <div className={getPriorityColor(activity.priority)}>{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">
                          {activity.timestamp.toLocaleTimeString()} • {activity.priority} priority
                        </p>
                      </div>
                      {activity.priority === "high" && <Zap className="h-4 w-4 text-orange-500" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agent Status Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentStatuses.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                        {agent.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-gray-500">Last active: {agent.lastActivity.toLocaleTimeString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {agent.activeSessions}/{agent.maxSessions} sessions
                        </p>
                        <p className="text-xs text-gray-500">Avg: {agent.avgResponseTime}</p>
                      </div>

                      <Progress value={(agent.activeSessions / agent.maxSessions) * 100} className="w-20 h-2" />

                      {getStatusBadge(agent.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">High queue volume detected</p>
                    <p className="text-xs text-yellow-600">Consider adding more agents to reduce wait times</p>
                  </div>
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    Warning
                  </Badge>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border border-green-200 bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">All systems operational</p>
                    <p className="text-xs text-green-600">Support system running smoothly</p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Healthy
                  </Badge>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">Real-time monitoring active</p>
                    <p className="text-xs text-blue-600">Collecting metrics every 5 seconds</p>
                  </div>
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
