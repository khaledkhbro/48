"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Bell,
  Send,
  Users,
  MessageSquare,
  AlertTriangle,
  Gift,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  BookTemplate as Template,
  Target,
  BarChart3,
} from "lucide-react"

interface AdminNotification {
  id: string
  title: string
  message: string
  notification_type: string
  priority: string
  target_type: string
  total_recipients: number
  delivery_status: string
  sent_at: string
  created_at: string
}

interface NotificationTemplate {
  id: string
  name: string
  title: string
  message: string
  notification_type: string
  priority: string
}

interface UserStats {
  total_users: number
  active_users: number
  job_posters: number
  workers: number
  verified_users: number
  new_users_30d: number
}

export default function AdminNotificationsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    notification_type: "system",
    priority: "normal",
    target_type: "all",
    target_users: "",
    template_id: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [notificationsRes, templatesRes, statsRes] = await Promise.all([
        fetch("/api/admin/notifications"),
        fetch("/api/admin/notifications/templates"),
        fetch("/api/admin/notifications/stats"),
      ])

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json()
        setNotifications(notificationsData)
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json()
        setTemplates(templatesData)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setUserStats(statsData)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast({
        title: "Error",
        description: "Failed to load notifications data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
        title: template.title,
        message: template.message,
        notification_type: template.notification_type,
        priority: template.priority,
        template_id: templateId,
      })
    }
  }

  const handleSendNotification = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          message: formData.message,
          notification_type: formData.notification_type,
          priority: formData.priority,
          target_type: formData.target_type,
          target_users: formData.target_users ? formData.target_users.split(",").map((id) => id.trim()) : null,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: `Notification sent to ${result.recipients_count} users`,
        })
        setIsCreateDialogOpen(false)
        setFormData({
          title: "",
          message: "",
          notification_type: "system",
          priority: "normal",
          target_type: "all",
          target_users: "",
          template_id: "",
        })
        loadData()
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to send notification")
      }
    } catch (error) {
      console.error("Failed to send notification:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send notification",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return <MessageSquare className="w-4 h-4" />
      case "warning":
        return <AlertTriangle className="w-4 h-4" />
      case "promotion":
        return <Gift className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "normal":
        return "bg-blue-100 text-blue-800"
      case "low":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTargetDescription = (targetType: string, recipientCount: number) => {
    switch (targetType) {
      case "all":
        return `All users (${recipientCount})`
      case "active":
        return `Active users (${recipientCount})`
      case "specific":
        return `Specific users (${recipientCount})`
      default:
        return `${recipientCount} users`
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Notifications" description="Send and manage notifications to users" />
        <div className="flex-1 overflow-auto p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Notifications" description="Send and manage notifications to users" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{userStats.total_users}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">{userStats.active_users}</p>
                    </div>
                    <Target className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Job Posters</p>
                      <p className="text-2xl font-bold text-gray-900">{userStats.job_posters}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">New Users (30d)</p>
                      <p className="text-2xl font-bold text-gray-900">{userStats.new_users_30d}</p>
                    </div>
                    <Plus className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Notification Management</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Notification to Users</DialogTitle>
                  <DialogDescription>
                    Create and send a notification to your users. Choose targeting options and message content.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Template Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="template">Use Template (Optional)</Label>
                    <Select value={formData.template_id} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <Template className="w-4 h-4" />
                              {template.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter notification title..."
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Enter notification message..."
                      rows={4}
                    />
                  </div>

                  {/* Type and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.notification_type}
                        onValueChange={(value) => setFormData({ ...formData, notification_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="promotion">Promotion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Target Type */}
                  <div className="space-y-2">
                    <Label htmlFor="target">Target Audience</Label>
                    <Select
                      value={formData.target_type}
                      onValueChange={(value) => setFormData({ ...formData, target_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users ({userStats?.total_users || 0})</SelectItem>
                        <SelectItem value="active">Active Users ({userStats?.active_users || 0})</SelectItem>
                        <SelectItem value="specific">Specific Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Specific Users */}
                  {formData.target_type === "specific" && (
                    <div className="space-y-2">
                      <Label htmlFor="target_users">User IDs (comma-separated)</Label>
                      <Input
                        id="target_users"
                        value={formData.target_users}
                        onChange={(e) => setFormData({ ...formData, target_users: e.target.value })}
                        placeholder="user1, user2, user3..."
                      />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendNotification} disabled={sending}>
                    {sending ? "Sending..." : "Send Notification"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Notifications List */}
          <Tabs defaultValue="sent" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sent">Sent Notifications</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="sent" className="space-y-4">
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card key={notification.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getNotificationIcon(notification.notification_type)}
                              <h3 className="font-medium text-gray-900">{notification.title}</h3>
                              <Badge className={getPriorityColor(notification.priority)}>{notification.priority}</Badge>
                              <Badge variant="outline">{notification.notification_type}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                {getTargetDescription(notification.target_type, notification.total_recipients)}
                              </span>
                              <span>Sent: {new Date(notification.sent_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(notification.delivery_status)}
                            <span className="text-sm text-gray-600 capitalize">{notification.delivery_status}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications sent yet</h3>
                    <p className="text-gray-600">Start by sending your first notification to users.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge className={getPriorityColor(template.priority)}>{template.priority}</Badge>
                      </div>
                      <CardDescription>{template.title}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">{template.message}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{template.notification_type}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleTemplateSelect(template.id)
                            setIsCreateDialogOpen(true)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
