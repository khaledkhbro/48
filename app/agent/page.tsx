"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Users, Clock, Settings, LogOut, Bell, TrendingUp } from "lucide-react"
import { AnonymousChatAgent } from "@/components/chat/anonymous-chat-agent"

export default function AgentDashboard() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth()
  const router = useRouter()
  const [agentStats, setAgentStats] = useState({
    activeSessions: 2,
    totalMessages: 47,
    avgResponseTime: "2.3 min",
    status: "available" as "available" | "busy" | "offline",
    todayResolved: 12,
    satisfaction: 4.8,
  })

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.userType !== "agent")) {
      router.push("/agent/login")
    }
  }, [isAuthenticated, isLoading, user, router])

  const handleStatusChange = (newStatus: "available" | "busy" | "offline") => {
    setAgentStats((prev) => ({ ...prev, status: newStatus }))
    // In real app, this would update the database
    console.log("[v0] Agent status updated to:", newStatus)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/agent/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || user?.userType !== "agent") {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Agent Dashboard</h1>
                  <p className="text-sm text-gray-600">Welcome back, {user.firstName}!</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Select value={agentStats.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Available
                    </div>
                  </SelectItem>
                  <SelectItem value="busy">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Busy
                    </div>
                  </SelectItem>
                  <SelectItem value="offline">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      Offline
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>

              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>

              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentStats.activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                {user.currentChatCount || 0} / {user.maxConcurrentChats || 5} max
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentStats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">+12% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentStats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">-0.5 min from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentStats.satisfaction}/5.0</div>
              <p className="text-xs text-muted-foreground">{agentStats.todayResolved} resolved today</p>
            </CardContent>
          </Card>
        </div>

        <AnonymousChatAgent />
      </div>
    </div>
  )
}
