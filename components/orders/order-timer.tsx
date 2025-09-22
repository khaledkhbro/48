"use client"

import { useState, useEffect } from "react"
import { Clock, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface OrderTimerProps {
  expiresAt: string | null
  status: string
  className?: string
}

export function OrderTimer({ expiresAt, status, className = "" }: OrderTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false })

  useEffect(() => {
    if (!expiresAt || status !== "in_progress") return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const difference = expiry - now

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeRemaining({ days, hours, minutes, seconds, isExpired: false })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, status])

  if (!expiresAt || status !== "in_progress") return null

  const { days, hours, minutes, seconds, isExpired } = timeRemaining
  const isUrgent = !isExpired && days === 0 && hours < 6 // Less than 6 hours remaining
  const isWarning = !isExpired && days === 0 && hours < 24 // Less than 24 hours remaining

  if (isExpired) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          EXPIRED
        </Badge>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge
        variant="secondary"
        className={`
          ${isUrgent ? "bg-red-100 text-red-800 border-red-200 animate-pulse" : ""}
          ${isWarning && !isUrgent ? "bg-orange-100 text-orange-800 border-orange-200" : ""}
          ${!isWarning ? "bg-blue-100 text-blue-800 border-blue-200" : ""}
          font-mono text-xs
        `}
      >
        <Clock className="h-3 w-3 mr-1" />
        {days > 0 && `${days}d `}
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </Badge>
      <span className="text-xs text-gray-500">{isUrgent ? "Urgent!" : isWarning ? "Due soon" : "remaining"}</span>
    </div>
  )
}
