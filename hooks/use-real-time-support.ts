"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface SupportNotification {
  id: string
  type: "new_ticket" | "urgent_ticket" | "agent_needed" | "system_alert"
  title: string
  message: string
  timestamp: Date
  priority: "low" | "normal" | "high" | "urgent"
  read: boolean
  actionUrl?: string
}

interface RealTimeSupportData {
  activeTickets: number
  queueLength: number
  agentsOnline: number
  avgResponseTime: string
  notifications: SupportNotification[]
}

export function useRealTimeSupport() {
  const { user } = useAuth()
  const [data, setData] = useState<RealTimeSupportData>({
    activeTickets: 0,
    queueLength: 0,
    agentsOnline: 0,
    avgResponseTime: "0 min",
    notifications: [],
  })
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSupportData = useCallback(async () => {
    try {
      // Simulate API calls for real-time data
      const [ticketsResponse, agentsResponse, notificationsResponse] = await Promise.all([
        fetch("/api/admin/support/metrics"),
        fetch("/api/admin/agents/status"),
        fetch("/api/admin/support/notifications"),
      ])

      // For demo purposes, using mock data
      const mockData: RealTimeSupportData = {
        activeTickets: Math.floor(Math.random() * 20) + 5,
        queueLength: Math.floor(Math.random() * 10),
        agentsOnline: Math.floor(Math.random() * 5) + 1,
        avgResponseTime: `${(Math.random() * 3 + 1).toFixed(1)} min`,
        notifications: [
          {
            id: "1",
            type: "urgent_ticket",
            title: "Urgent Support Ticket",
            message: "Priority ticket requires immediate attention",
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            priority: "urgent",
            read: false,
            actionUrl: "/admin/support",
          },
          {
            id: "2",
            type: "agent_needed",
            title: "High Queue Volume",
            message: "Consider adding more agents to reduce wait times",
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            priority: "high",
            read: false,
          },
        ],
      }

      setData(mockData)
      setIsConnected(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch support data")
      setIsConnected(false)
    }
  }, [])

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/admin/support/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      })

      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      }))
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  }, [])

  const clearAllNotifications = useCallback(async () => {
    try {
      await fetch("/api/admin/support/notifications", {
        method: "DELETE",
      })

      setData((prev) => ({
        ...prev,
        notifications: [],
      }))
    } catch (err) {
      console.error("Failed to clear notifications:", err)
    }
  }, [])

  useEffect(() => {
    if (!user || user.userType !== "admin") return

    fetchSupportData()
    const interval = setInterval(fetchSupportData, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [user, fetchSupportData])

  return {
    data,
    isConnected,
    error,
    refresh: fetchSupportData,
    markNotificationAsRead,
    clearAllNotifications,
  }
}
