"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Briefcase,
  MessageCircle,
  DollarSign,
  AlertCircle,
  Settings,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"

interface Notification {
  id: string
  userId: string
  type: "job" | "message" | "payment" | "system" | "order" // Added order type
  title: string
  description: string
  timestamp: string
  read: boolean
  actionUrl?: string
  recipientId?: string
  orderId?: string
  orderStatus?: string
  priority?: "low" | "normal" | "high" | "urgent"
}

const NOTIFICATIONS_PER_PAGE = 20

export default function NotificationsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const loadNotifications = () => {
    if (!user) return

    console.log("[v0] Loading notifications for user:", user.id)
    const allNotifications = JSON.parse(localStorage.getItem("marketplace-notifications") || "[]")

    console.log("[v0] All notifications in storage:", allNotifications.length)

    const userNotifications = allNotifications.filter((n: Notification) => {
      return (
        n.userId === user.id ||
        n.userId === user.username ||
        n.userId === `user-${user.id}` ||
        n.userId === `user_${user.id}` ||
        n.recipientId === user.id ||
        n.recipientId === user.username
      )
    })

    console.log("[v0] Found notifications:", userNotifications.length)
    const sortedNotifications = userNotifications.sort(
      (a: Notification, b: Notification) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    setNotifications(sortedNotifications)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return

    loadNotifications()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "marketplace-notifications") {
        console.log("[v0] Notifications updated in storage, reloading...")
        loadNotifications()
      }
    }

    const pollInterval = setInterval(() => {
      loadNotifications()
    }, 5000)

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(pollInterval)
    }
  }, [user])

  const markAsRead = (id: string) => {
    console.log("[v0] Marking notification as read:", id)
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )

    const allNotifications = JSON.parse(localStorage.getItem("marketplace-notifications") || "[]")
    const updatedNotifications = allNotifications.map((n: Notification) => (n.id === id ? { ...n, read: true } : n))
    localStorage.setItem("marketplace-notifications", JSON.stringify(updatedNotifications))

    window.dispatchEvent(new StorageEvent("storage", { key: "marketplace-notifications" }))

    toast({
      title: "Marked as read",
      description: "Notification has been marked as read.",
    })
  }

  const markAllAsRead = () => {
    if (!user) return

    console.log("[v0] Marking all notifications as read for user:", user.id)
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))

    const allNotifications = JSON.parse(localStorage.getItem("marketplace-notifications") || "[]")
    const updatedNotifications = allNotifications.map((n: Notification) =>
      n.userId === user.id ? { ...n, read: true } : n,
    )
    localStorage.setItem("marketplace-notifications", JSON.stringify(updatedNotifications))

    window.dispatchEvent(new StorageEvent("storage", { key: "marketplace-notifications" }))

    toast({
      title: "All notifications marked as read",
      description: "All your notifications have been marked as read.",
    })
  }

  const deleteNotification = (id: string) => {
    console.log("[v0] Deleting notification:", id)
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))

    const allNotifications = JSON.parse(localStorage.getItem("marketplace-notifications") || "[]")
    const updatedNotifications = allNotifications.filter((n: Notification) => n.id !== id)
    localStorage.setItem("marketplace-notifications", JSON.stringify(updatedNotifications))

    window.dispatchEvent(new StorageEvent("storage", { key: "marketplace-notifications" }))

    toast({
      title: "Notification deleted",
      description: "The notification has been removed.",
    })
  }

  const getPaginatedNotifications = (notificationsList: Notification[]) => {
    const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE
    const endIndex = startIndex + NOTIFICATIONS_PER_PAGE
    return notificationsList.slice(startIndex, endIndex)
  }

  const getTotalPages = (notificationsList: Notification[]) => {
    return Math.ceil(notificationsList.length / NOTIFICATIONS_PER_PAGE)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const allNotifications = notifications
  const unreadNotifications = notifications.filter((n) => !n.read)
  const orderNotifications = notifications.filter((n) => n.type === "order")
  const paymentNotifications = notifications.filter((n) => n.type === "payment")

  const PaginationComponent = ({ notificationsList }: { notificationsList: Notification[] }) => {
    const totalPages = getTotalPages(notificationsList)

    if (totalPages <= 1) return null

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage > 1) handlePageChange(currentPage - 1)
              }}
              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber
            if (totalPages <= 5) {
              pageNumber = i + 1
            } else if (currentPage <= 3) {
              pageNumber = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i
            } else {
              pageNumber = currentPage - 2 + i
            }

            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange(pageNumber)
                  }}
                  isActive={currentPage === pageNumber}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            )
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage < totalPages) handlePageChange(currentPage + 1)
              }}
              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const getNotificationIcon = (type: string, orderStatus?: string, priority?: string) => {
      const getPriorityColor = (priority?: string) => {
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
            return "text-blue-600"
        }
      }

      switch (type) {
        case "job":
          return <Briefcase className={`w-5 h-5 ${getPriorityColor(priority)}`} />
        case "message":
          return <MessageCircle className="w-5 h-5 text-green-600" />
        case "payment":
          return <DollarSign className="w-5 h-5 text-yellow-600" />
        case "system":
          return <AlertCircle className="w-5 h-5 text-orange-600" />
        case "order":
          switch (orderStatus) {
            case "awaiting_acceptance":
              return <Clock className="w-5 h-5 text-yellow-600" />
            case "in_progress":
              return <ShoppingCart className="w-5 h-5 text-blue-600" />
            case "delivered":
              return <CheckCircle className="w-5 h-5 text-green-600" />
            case "completed":
              return <CheckCircle className="w-5 h-5 text-green-700" />
            case "cancelled":
              return <XCircle className="w-5 h-5 text-red-600" />
            case "disputed":
              return <AlertTriangle className="w-5 h-5 text-orange-600" />
            default:
              return <ShoppingCart className={`w-5 h-5 ${getPriorityColor(priority)}`} />
          }
        default:
          return <Bell className="w-5 h-5 text-gray-600" />
      }
    }

    const getPriorityBadge = (priority?: string) => {
      if (!priority || priority === "normal") return null

      const badgeConfig = {
        urgent: { color: "bg-red-100 text-red-800", label: "Urgent" },
        high: { color: "bg-orange-100 text-orange-800", label: "High" },
        low: { color: "bg-gray-100 text-gray-800", label: "Low" },
      }

      const config = badgeConfig[priority as keyof typeof badgeConfig]
      if (!config) return null

      return (
        <Badge variant="secondary" className={config.color}>
          {config.label}
        </Badge>
      )
    }

    return (
      <Card className={`transition-all hover:shadow-md ${!notification.read ? "border-blue-200 bg-blue-50/30" : ""}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type, notification.orderStatus, notification.priority)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base leading-tight">
                    {notification.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 leading-relaxed">{notification.description}</p>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                    <p className="text-xs text-gray-500">{new Date(notification.timestamp).toLocaleString()}</p>
                    {notification.orderId && (
                      <Badge variant="outline" className="text-xs">
                        Order #{notification.orderId.slice(-8)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {!notification.read && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        New
                      </Badge>
                    )}
                    {getPriorityBadge(notification.priority)}
                  </div>
                  <div className="flex gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <>
        <DashboardHeader title="Notifications" description="Stay updated with your latest activities and messages." />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader title="Notifications" description="Stay updated with your latest activities and messages." />

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="text-base sm:text-lg font-semibold">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
              </span>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={markAllAsRead}
                  size="sm"
                  className="flex-1 sm:flex-none bg-transparent"
                >
                  <CheckCheck className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Mark all as read</span>
                  <span className="sm:hidden">Mark all</span>
                </Button>
              )}
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-transparent">
                <Filter className="w-4 h-4 mr-1 sm:mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Notifications Tabs */}
          <Tabs defaultValue="all" className="space-y-4 sm:space-y-6" onValueChange={() => setCurrentPage(1)}>
            <div className="overflow-x-auto">
              <TabsList className="w-full sm:w-auto min-w-max">
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs sm:text-sm">
                  Unread ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs sm:text-sm">
                  Orders ({orderNotifications.length})
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-xs sm:text-sm">
                  Payments ({paymentNotifications.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-3 sm:space-y-4">
              {allNotifications.length > 0 ? (
                <>
                  {getPaginatedNotifications(allNotifications).map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                  <PaginationComponent notificationsList={allNotifications} />
                </>
              ) : (
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      You'll see notifications here when you have new activity.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="unread" className="space-y-3 sm:space-y-4">
              {unreadNotifications.length > 0 ? (
                <>
                  {getPaginatedNotifications(unreadNotifications).map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                  <PaginationComponent notificationsList={unreadNotifications} />
                </>
              ) : (
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <CheckCheck className="w-10 h-10 sm:w-12 sm:h-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-sm sm:text-base text-gray-600">You have no unread notifications.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="orders" className="space-y-3 sm:space-y-4">
              {orderNotifications.length > 0 ? (
                <>
                  {getPaginatedNotifications(orderNotifications).map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                  <PaginationComponent notificationsList={orderNotifications} />
                </>
              ) : (
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No order notifications</h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      Order updates and status changes will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-3 sm:space-y-4">
              {paymentNotifications.length > 0 ? (
                <>
                  {getPaginatedNotifications(paymentNotifications).map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                  <PaginationComponent notificationsList={paymentNotifications} />
                </>
              ) : (
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No payment notifications</h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      Payment updates and transaction alerts will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Quick Settings */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                Notification Settings
              </CardTitle>
              <CardDescription className="text-sm">Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-transparent"
                onClick={() => router.push("/dashboard/settings?tab=notifications")}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Notifications
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
