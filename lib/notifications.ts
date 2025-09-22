// Notification system for real-time user updates
export interface Notification {
  id: string
  userId: string
  type: "job" | "message" | "payment" | "system" | "order" // Added order type
  title: string
  description: string
  timestamp: string
  read: boolean
  actionUrl?: string
  orderId?: string
  orderStatus?: string
  priority?: "low" | "normal" | "high" | "urgent"
}

const NOTIFICATIONS_STORAGE_KEY = "marketplace-notifications"

const getStoredNotifications = (): Notification[] => {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const saveNotifications = (notifications: Notification[]): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications))
    window.dispatchEvent(new StorageEvent("storage", { key: NOTIFICATIONS_STORAGE_KEY }))
  } catch (error) {
    console.error("Failed to save notifications:", error)
  }
}

export async function createNotification(data: {
  userId: string
  type: "job" | "message" | "payment" | "system" | "order"
  title: string
  description: string
  actionUrl?: string
  orderId?: string
  orderStatus?: string
  priority?: "low" | "normal" | "high" | "urgent"
}): Promise<Notification> {
  const newNotification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: data.userId,
    type: data.type,
    title: data.title,
    description: data.description,
    timestamp: new Date().toISOString(),
    read: false,
    actionUrl: data.actionUrl,
    orderId: data.orderId,
    orderStatus: data.orderStatus,
    priority: data.priority || "normal",
  }

  const notifications = getStoredNotifications()
  notifications.unshift(newNotification) // Add to beginning for newest first

  const userNotifications = notifications.filter((n) => n.userId === data.userId)
  if (userNotifications.length > 100) {
    const notificationsToKeep = notifications.filter((n) => n.userId !== data.userId)
    const recentUserNotifications = userNotifications.slice(0, 100)
    notifications.splice(0, notifications.length, ...notificationsToKeep, ...recentUserNotifications)
  }

  saveNotifications(notifications)

  console.log(`[v0] Created notification: ${data.type} - ${data.title} for user ${data.userId}`)
  return newNotification
}

export async function createOrderNotification(data: {
  userId: string
  orderId: string
  orderStatus: string
  title: string
  description: string
  actionUrl?: string
  priority?: "low" | "normal" | "high" | "urgent"
}): Promise<Notification> {
  return createNotification({
    userId: data.userId,
    type: "order",
    title: data.title,
    description: data.description,
    actionUrl: data.actionUrl,
    orderId: data.orderId,
    orderStatus: data.orderStatus,
    priority: data.priority,
  })
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const notifications = getStoredNotifications()
  return notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function getNotificationsByType(userId: string, type: Notification["type"]): Promise<Notification[]> {
  const notifications = getStoredNotifications()
  return notifications
    .filter((n) => n.userId === userId && n.type === type)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function getOrderNotifications(userId: string, orderId?: string): Promise<Notification[]> {
  const notifications = getStoredNotifications()
  return notifications
    .filter((n) => {
      if (n.userId !== userId) return false
      if (n.type !== "order") return false
      if (orderId && n.orderId !== orderId) return false
      return true
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notifications = getStoredNotifications()
  const notificationIndex = notifications.findIndex((n) => n.id === notificationId)

  if (notificationIndex !== -1) {
    notifications[notificationIndex].read = true
    saveNotifications(notifications)
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notifications = getStoredNotifications()
  const updatedNotifications = notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n))
  saveNotifications(updatedNotifications)
}

export async function markOrderNotificationsAsRead(userId: string, orderId: string): Promise<void> {
  const notifications = getStoredNotifications()
  const updatedNotifications = notifications.map((n) =>
    n.userId === userId && n.orderId === orderId ? { ...n, read: true } : n,
  )
  saveNotifications(updatedNotifications)
}

export async function getRecentActivity(userId: string, limit = 10): Promise<Notification[]> {
  const notifications = getStoredNotifications()
  return notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const notifications = getStoredNotifications()
  return notifications.filter((n) => n.userId === userId && !n.read).length
}

export async function getUnreadNotificationCountByType(userId: string, type: Notification["type"]): Promise<number> {
  const notifications = getStoredNotifications()
  return notifications.filter((n) => n.userId === userId && n.type === type && !n.read).length
}

export async function cleanupOldNotifications(daysOld = 30): Promise<void> {
  const notifications = getStoredNotifications()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const filteredNotifications = notifications.filter((n) => new Date(n.timestamp) > cutoffDate)

  if (filteredNotifications.length !== notifications.length) {
    saveNotifications(filteredNotifications)
    console.log(`[v0] Cleaned up ${notifications.length - filteredNotifications.length} old notifications`)
  }
}
