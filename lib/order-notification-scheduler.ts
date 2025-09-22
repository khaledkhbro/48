import { marketplaceOrderManager } from "./marketplace-orders"

class OrderNotificationScheduler {
  private intervalId: NodeJS.Timeout | null = null

  // Start the notification scheduler
  start(): void {
    if (this.intervalId) {
      console.log("[v0] Order notification scheduler already running")
      return
    }

    console.log("[v0] Starting order notification scheduler")

    // Check every 30 minutes for deadline reminders
    this.intervalId = setInterval(
      () => {
        try {
          marketplaceOrderManager.sendDeadlineReminders()
          marketplaceOrderManager.cleanupExpiredOrders()
        } catch (error) {
          console.error("[v0] Error in notification scheduler:", error)
        }
      },
      30 * 60 * 1000,
    ) // 30 minutes
  }

  // Stop the notification scheduler
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log("[v0] Order notification scheduler stopped")
    }
  }

  // Send immediate reminder for specific order
  sendImmediateReminder(orderId: string, reminderType: "acceptance" | "review"): void {
    const order = marketplaceOrderManager.getOrder(orderId)
    if (!order) return

    if (reminderType === "acceptance" && order.status === "awaiting_acceptance") {
      marketplaceOrderManager["sendOrderNotification"](order, "deadline_reminder")
    } else if (reminderType === "review" && order.status === "delivered") {
      marketplaceOrderManager["sendOrderNotification"](order, "auto_release_warning")
    }
  }
}

// Export singleton instance
export const orderNotificationScheduler = new OrderNotificationScheduler()

// Auto-start scheduler when module loads (in browser environment)
if (typeof window !== "undefined") {
  orderNotificationScheduler.start()
}
