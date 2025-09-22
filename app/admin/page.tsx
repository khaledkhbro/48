"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  DollarSign,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Activity,
  Shield,
  Settings,
  Bell,
  UserCheck,
  Clock,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"

interface SystemMetrics {
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  monthlyRevenue: number
  activeJobs: number
  completedJobs: number
  activeServices: number
  pendingApprovals: number
  supportTickets: number
  agentsOnline: number
  systemHealth: number
  serverLoad: number
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 1234,
    activeUsers: 892,
    totalRevenue: 45231,
    monthlyRevenue: 12450,
    activeJobs: 573,
    completedJobs: 2847,
    activeServices: 89,
    pendingApprovals: 23,
    supportTickets: 12,
    agentsOnline: 3,
    systemHealth: 98,
    serverLoad: 45,
  })

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, type: "user", message: "New user registration: John Doe", time: "2 hours ago", status: "success" },
    { id: 2, type: "job", message: "Job completed: React Developer project", time: "4 hours ago", status: "success" },
    { id: 3, type: "payment", message: "$250 payment processed", time: "6 hours ago", status: "success" },
    { id: 4, type: "support", message: "New support ticket opened", time: "8 hours ago", status: "warning" },
    { id: 5, type: "system", message: "Database backup completed", time: "12 hours ago", status: "info" },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 3) - 1,
        serverLoad: Math.max(20, Math.min(80, prev.serverLoad + Math.floor(Math.random() * 10) - 5)),
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user":
        return <Users className="h-4 w-4" />
      case "job":
        return <Briefcase className="h-4 w-4" />
      case "payment":
        return <DollarSign className="h-4 w-4" />
      case "support":
        return <MessageSquare className="h-4 w-4" />
      case "system":
        return <Settings className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      case "info":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and key metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            System Online
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            {metrics.agentsOnline} Agents Active
          </Badge>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Alerts ({metrics.supportTickets})
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users & Agents</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+20.1%</span> from last month
                </p>
                <div className="text-xs text-muted-foreground mt-1">{metrics.activeUsers} active now</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+15.3%</span> from last month
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  ${metrics.monthlyRevenue.toLocaleString()} this month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeJobs}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12.5%</span> from last month
                </p>
                <div className="text-xs text-muted-foreground mt-1">{metrics.completedJobs} completed total</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Support</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.supportTickets}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-600">+3</span> new today
                </p>
                <div className="text-xs text-muted-foreground mt-1">{metrics.pendingApprovals} pending approvals</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Health</span>
                    <span className="font-medium">{metrics.systemHealth}%</span>
                  </div>
                  <Progress value={metrics.systemHealth} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Server Load</span>
                    <span className="font-medium">{metrics.serverLoad}%</span>
                  </div>
                  <Progress value={metrics.serverLoad} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Database</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">API</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Payments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Email</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`mt-0.5 ${getStatusColor(activity.status)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Users</span>
                  <Badge variant="outline">{metrics.totalUsers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Users</span>
                  <Badge variant="outline">{metrics.activeUsers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Verification</span>
                  <Badge variant="destructive">23</Badge>
                </div>
                <Button asChild className="w-full">
                  <Link href="/admin/users">Manage Users</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Agent Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Agents</span>
                  <Badge variant="outline">12</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Online Now</span>
                  <Badge variant="default">{metrics.agentsOnline}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg Response Time</span>
                  <Badge variant="outline">2.3 min</Badge>
                </div>
                <Button asChild className="w-full">
                  <Link href="/admin/agents">Manage Agents</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Roles & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Admin Roles</span>
                  <Badge variant="outline">5</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Custom Permissions</span>
                  <Badge variant="outline">24</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Access Violations</span>
                  <Badge variant="destructive">0</Badge>
                </div>
                <Button asChild className="w-full">
                  <Link href="/admin/roles">Manage Roles</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Jobs & Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{metrics.activeJobs + metrics.activeServices}</div>
                <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                  <Link href="/admin/jobs">Manage Jobs</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">$45.2K</div>
                <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                  <Link href="/admin/transactions">View Transactions</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">13</div>
                <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                  <Link href="/admin/marketplace-categories">Manage Categories</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">24</div>
                <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                  <Link href="/admin/reports">View Reports</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                  <Link href="/admin/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Platform Settings
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                  <Link href="/admin/financial-overview">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Financial Settings
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                  <Link href="/admin/support">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Support Management
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                  <Link href="/admin/chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat Management
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Server Status</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Gateway</span>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">Maintenance</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Service</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/admin/users">
                <Users className="h-6 w-6 mb-2" />
                <span className="text-sm">Users</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/admin/jobs">
                <Briefcase className="h-6 w-6 mb-2" />
                <span className="text-sm">Jobs</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/admin/transactions">
                <DollarSign className="h-6 w-6 mb-2" />
                <span className="text-sm">Payments</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/admin/support">
                <MessageSquare className="h-6 w-6 mb-2" />
                <span className="text-sm">Support</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/admin/settings">
                <Settings className="h-6 w-6 mb-2" />
                <span className="text-sm">Settings</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
              <Link href="/admin/reports">
                <TrendingUp className="h-6 w-6 mb-2" />
                <span className="text-sm">Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
