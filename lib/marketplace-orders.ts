export interface MarketplaceOrder {
  id: string
  serviceId: string
  sellerId: string
  buyerId: string
  serviceName: string
  serviceImage?: string
  tier: "basic" | "standard" | "premium"
  price: number
  deliveryTime: number // in days
  status:
    | "awaiting_acceptance"
    | "pending"
    | "in_progress"
    | "delivered"
    | "completed"
    | "cancelled"
    | "disputed"
    | "dispute_resolved"
  createdAt: string
  acceptedAt?: string
  deliveredAt?: string
  completedAt?: string
  disputedAt?: string

  // Countdown timers
  acceptanceDeadline?: string
  reviewDeadline?: string

  // Order details
  requirements: string
  deliverables?: {
    files: string[]
    message: string
    submittedAt: string
  }

  // Communication
  messages: OrderMessage[]

  // Dispute info
  disputeReason?: string
  disputeDetails?: string
  disputeEvidenceFiles?: string[]
  adminDecision?: "refund_buyer" | "pay_seller"
  adminNotes?: string
}

export interface OrderMessage {
  id: string
  senderId: string
  senderType: "buyer" | "seller" | "admin"
  message: string
  files?: string[]
  timestamp: string
}

export interface OrderSettings {
  acceptanceWindowHours: number
  reviewPeriodDays: number
  autoReleasePayment: boolean
}

export interface WalletTransaction {
  id: string
  userId: string
  type: "deposit" | "withdrawal" | "order_hold" | "order_release" | "refund"
  amount: number
  orderId?: string
  description: string
  timestamp: string
  status: "pending" | "completed" | "failed"
}

class MarketplaceOrderManager {
  private readonly ORDERS_KEY = "marketplace_orders"
  private readonly SETTINGS_KEY = "marketplace_order_settings"
  private readonly WALLET_KEY = "marketplace_wallets"
  private readonly TRANSACTIONS_KEY = "marketplace_transactions"
  private readonly ORDER_COUNTER_KEY = "marketplace_order_counter"

  // Default settings
  private defaultSettings: OrderSettings = {
    acceptanceWindowHours: 24,
    reviewPeriodDays: 3,
    autoReleasePayment: true,
  }

  // Order Management
  createOrder(
    orderData: Omit<MarketplaceOrder, "id" | "status" | "createdAt" | "acceptanceDeadline" | "messages">,
  ): MarketplaceOrder {
    const settings = this.getSettings()
    const orderNumber = this.getNextOrderNumber()
    const orderId = `#${orderNumber}`

    const acceptanceDeadline = new Date()
    acceptanceDeadline.setHours(acceptanceDeadline.getHours() + settings.acceptanceWindowHours)

    const order: MarketplaceOrder = {
      ...orderData,
      id: orderId,
      status: "awaiting_acceptance",
      createdAt: new Date().toISOString(),
      acceptanceDeadline: acceptanceDeadline.toISOString(),
      messages: [],
    }

    // Hold money in buyer's wallet
    this.holdOrderPayment(orderData.buyerId, order.price, orderId)

    this.saveOrder(order)

    this.sendOrderNotification(order, "order_placed")

    return order
  }

  acceptOrder(orderId: string, sellerId: string): boolean {
    const order = this.getOrder(orderId)
    if (!order || order.sellerId !== sellerId || order.status !== "awaiting_acceptance") {
      return false
    }

    // Check if acceptance window hasn't expired
    if (new Date() > new Date(order.acceptanceDeadline!)) {
      this.cancelOrder(orderId, "Acceptance window expired")
      return false
    }

    order.status = "pending"
    order.acceptedAt = new Date().toISOString()

    // Calculate delivery deadline
    const deliveryDeadline = new Date()
    deliveryDeadline.setDate(deliveryDeadline.getDate() + order.deliveryTime)

    this.saveOrder(order)

    this.sendOrderNotification(order, "order_accepted")

    return true
  }

  declineOrder(orderId: string, sellerId: string, reason?: string): boolean {
    const order = this.getOrder(orderId)
    if (!order || order.sellerId !== sellerId || order.status !== "awaiting_acceptance") {
      return false
    }

    return this.cancelOrder(orderId, reason || "Declined by seller")
  }

  updateOrderStatus(orderId: string, sellerId: string, newStatus: "pending" | "in_progress" | "delivered"): boolean {
    const order = this.getOrder(orderId)
    if (!order || order.sellerId !== sellerId) {
      return false
    }

    const validTransitions: Record<string, string[]> = {
      pending: ["in_progress"],
      in_progress: ["delivered"],
      delivered: [], // Can't change from delivered
    }

    if (!validTransitions[order.status]?.includes(newStatus)) {
      return false
    }

    const oldStatus = order.status
    order.status = newStatus

    if (newStatus === "delivered") {
      order.deliveredAt = new Date().toISOString()

      // Start review countdown
      const settings = this.getSettings()
      const reviewDeadline = new Date()
      reviewDeadline.setDate(reviewDeadline.getDate() + settings.reviewPeriodDays)
      order.reviewDeadline = reviewDeadline.toISOString()

      // Schedule auto-release if enabled
      if (settings.autoReleasePayment) {
        this.scheduleAutoRelease(orderId, reviewDeadline)
      }
    }

    this.saveOrder(order)

    if (newStatus === "in_progress") {
      this.sendOrderNotification(order, "work_started")
    } else if (newStatus === "delivered") {
      this.sendOrderNotification(order, "work_delivered")
    }

    return true
  }

  submitDelivery(orderId: string, sellerId: string, deliverables: { files: string[]; message: string }): boolean {
    const order = this.getOrder(orderId)
    if (!order || order.sellerId !== sellerId || order.status !== "in_progress") {
      return false
    }

    order.deliverables = {
      ...deliverables,
      submittedAt: new Date().toISOString(),
    }

    return this.updateOrderStatus(orderId, sellerId, "delivered")
  }

  releasePayment(orderId: string, buyerId: string): boolean {
    const order = this.getOrder(orderId)
    if (!order || order.buyerId !== buyerId || order.status !== "delivered") {
      return false
    }

    order.status = "completed"
    order.completedAt = new Date().toISOString()

    // Release payment to seller
    this.releaseOrderPayment(order.buyerId, order.sellerId, order.price, orderId)

    this.saveOrder(order)

    this.sendOrderNotification(order, "payment_approved")

    return true
  }

  openDispute(
    orderId: string,
    userId: string,
    userType: "buyer" | "seller",
    reason: string,
    details: string,
    evidenceFiles?: string[],
  ): boolean {
    console.log("[v0] openDispute called with:", {
      orderId,
      userId,
      userType,
      reason,
      details,
      evidenceFiles: evidenceFiles?.length || 0,
    })

    const order = this.getOrder(orderId)
    if (!order) {
      console.log("[v0] Order not found:", orderId)
      return false
    }

    console.log("[v0] Order found:", {
      id: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      status: order.status,
    })

    // Allow both buyers and sellers to open disputes for delivered orders
    const isAuthorized =
      (userType === "buyer" && order.buyerId === userId) || (userType === "seller" && order.sellerId === userId)

    console.log("[v0] Authorization check:", {
      userType,
      userId,
      orderBuyerId: order.buyerId,
      orderSellerId: order.sellerId,
      isAuthorized,
      orderStatus: order.status,
    })

    if (!isAuthorized || order.status !== "delivered") {
      console.log("[v0] Dispute not authorized or order not delivered")
      return false
    }

    order.status = "disputed"
    order.disputedAt = new Date().toISOString()
    order.disputeReason = reason
    order.disputeDetails = details
    order.disputeEvidenceFiles = evidenceFiles || []

    this.saveOrder(order)

    console.log("[v0] Creating admin dispute with userType:", userType)
    this.createAdminDisputeForOrder(order, reason, details, userType, evidenceFiles)

    this.sendOrderNotification(order, "dispute_created", userType)

    console.log("[v0] Dispute created successfully")
    return true
  }

  resolveDispute(orderId: string, adminId: string, decision: "refund_buyer" | "pay_seller", notes?: string): boolean {
    const order = this.getOrder(orderId)
    if (!order || order.status !== "disputed") {
      return false
    }

    order.status = "dispute_resolved"
    order.adminDecision = decision
    order.adminNotes = notes
    order.completedAt = new Date().toISOString()

    // Handle payment based on decision
    if (decision === "refund_buyer") {
      this.refundOrderPayment(order.buyerId, order.price, orderId)
    } else {
      this.releaseOrderPayment(order.buyerId, order.sellerId, order.price, orderId)
    }

    this.saveOrder(order)

    this.sendOrderNotification(order, "dispute_resolved")

    return true
  }

  cancelOrder(orderId: string, reason: string): boolean {
    const order = this.getOrder(orderId)
    if (!order || !["awaiting_acceptance", "pending"].includes(order.status)) {
      return false
    }

    order.status = "cancelled"
    order.completedAt = new Date().toISOString()

    // Refund buyer
    this.refundOrderPayment(order.buyerId, order.price, orderId)

    this.saveOrder(order)

    this.sendOrderNotification(order, "order_cancelled")

    return true
  }

  updateOrderRequirements(orderId: string, buyerId: string, requirements: string): boolean {
    const order = this.getOrder(orderId)
    if (!order || order.buyerId !== buyerId) {
      return false
    }

    // Only allow requirements updates for orders that haven't started work yet
    if (!["awaiting_acceptance", "pending"].includes(order.status)) {
      return false
    }

    order.requirements = requirements
    this.saveOrder(order)
    return true
  }

  // Message Management
  addMessage(
    orderId: string,
    senderId: string,
    senderType: "buyer" | "seller" | "admin",
    message: string,
    files?: string[],
  ): boolean {
    const order = this.getOrder(orderId)
    if (!order) return false

    const msgNumber = this.getNextOrderNumber()
    const messageObj: OrderMessage = {
      id: `msg_${msgNumber}`,
      senderId,
      senderType,
      message,
      files,
      timestamp: new Date().toISOString(),
    }

    order.messages.push(messageObj)
    this.saveOrder(order)
    return true
  }

  // Wallet Management
  getWalletBalance(userId: string): number {
    const wallets = this.getWallets()
    return wallets[userId] || 0
  }

  depositToWallet(userId: string, amount: number): boolean {
    if (amount <= 0) return false

    const wallets = this.getWallets()
    wallets[userId] = (wallets[userId] || 0) + amount

    this.saveWallets(wallets)
    this.addTransaction(userId, "deposit", amount, undefined, `Wallet deposit of $${amount}`)
    return true
  }

  withdrawFromWallet(userId: string, amount: number): boolean {
    const balance = this.getWalletBalance(userId)
    if (amount <= 0 || amount > balance) return false

    const wallets = this.getWallets()
    wallets[userId] = balance - amount

    this.saveWallets(wallets)
    this.addTransaction(userId, "withdrawal", -amount, undefined, `Wallet withdrawal of $${amount}`)
    return true
  }

  private holdOrderPayment(buyerId: string, amount: number, orderId: string): boolean {
    const balance = this.getWalletBalance(buyerId)
    if (amount > balance) return false

    const wallets = this.getWallets()
    wallets[buyerId] = balance - amount

    this.saveWallets(wallets)
    this.addTransaction(buyerId, "order_hold", -amount, orderId, `Payment held for order ${orderId}`)
    return true
  }

  private releaseOrderPayment(buyerId: string, sellerId: string, amount: number, orderId: string): void {
    const wallets = this.getWallets()
    wallets[sellerId] = (wallets[sellerId] || 0) + amount

    this.saveWallets(wallets)
    this.addTransaction(sellerId, "order_release", amount, orderId, `Payment received for order ${orderId}`)
  }

  private refundOrderPayment(buyerId: string, amount: number, orderId: string): void {
    const wallets = this.getWallets()
    wallets[buyerId] = (wallets[buyerId] || 0) + amount

    this.saveWallets(wallets)
    this.addTransaction(buyerId, "refund", amount, orderId, `Refund for order ${orderId}`)
  }

  private addTransaction(
    userId: string,
    type: WalletTransaction["type"],
    amount: number,
    orderId?: string,
    description?: string,
  ): void {
    const transactions = this.getTransactions()
    const txnNumber = this.getNextOrderNumber()
    const transaction: WalletTransaction = {
      id: `txn_${txnNumber}`,
      userId,
      type,
      amount,
      orderId,
      description: description || "",
      timestamp: new Date().toISOString(),
      status: "completed",
    }

    transactions.push(transaction)
    localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions))
  }

  // Auto-release scheduling (simplified - in real app would use proper scheduling)
  private scheduleAutoRelease(orderId: string, deadline: Date): void {
    const timeUntilRelease = deadline.getTime() - Date.now()
    if (timeUntilRelease > 0) {
      setTimeout(() => {
        const order = this.getOrder(orderId)
        if (order && order.status === "delivered") {
          this.releasePayment(orderId, order.buyerId)
        }
      }, timeUntilRelease)
    }
  }

  // Data persistence
  private saveOrder(order: MarketplaceOrder): void {
    const orders = this.getAllOrders()
    const index = orders.findIndex((o) => o.id === order.id)

    if (index >= 0) {
      orders[index] = order
    } else {
      orders.push(order)
    }

    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders))
  }

  getOrder(orderId: string): MarketplaceOrder | null {
    const orders = this.getAllOrders()
    return orders.find((o) => o.id === orderId) || null
  }

  getAllOrders(): MarketplaceOrder[] {
    const stored = localStorage.getItem(this.ORDERS_KEY)
    return stored ? JSON.parse(stored) : []
  }

  getOrdersByUser(userId: string, userType: "buyer" | "seller"): MarketplaceOrder[] {
    const orders = this.getAllOrders()
    return orders.filter((order) => (userType === "buyer" ? order.buyerId === userId : order.sellerId === userId))
  }

  getOrdersByStatus(status: MarketplaceOrder["status"]): MarketplaceOrder[] {
    return this.getAllOrders().filter((order) => order.status === status)
  }

  // Settings Management
  getSettings(): OrderSettings {
    const stored = localStorage.getItem(this.SETTINGS_KEY)
    return stored ? { ...this.defaultSettings, ...JSON.parse(stored) } : this.defaultSettings
  }

  updateSettings(settings: Partial<OrderSettings>): void {
    const current = this.getSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated))
  }

  // Wallet data
  private getWallets(): Record<string, number> {
    const stored = localStorage.getItem(this.WALLET_KEY)
    return stored ? JSON.parse(stored) : {}
  }

  private saveWallets(wallets: Record<string, number>): void {
    localStorage.setItem(this.WALLET_KEY, JSON.stringify(wallets))
  }

  getTransactions(userId?: string): WalletTransaction[] {
    const stored = localStorage.getItem(this.TRANSACTIONS_KEY)
    const transactions: WalletTransaction[] = stored ? JSON.parse(stored) : []

    return userId ? transactions.filter((t) => t.userId === userId) : transactions
  }

  // Utility methods
  isOrderExpired(order: MarketplaceOrder): boolean {
    if (order.status === "awaiting_acceptance" && order.acceptanceDeadline) {
      return new Date() > new Date(order.acceptanceDeadline)
    }
    if (order.status === "delivered" && order.reviewDeadline) {
      return new Date() > new Date(order.reviewDeadline)
    }
    return false
  }

  getTimeRemaining(deadline: string): { days: number; hours: number; minutes: number } {
    const now = new Date().getTime()
    const target = new Date(deadline).getTime()
    const diff = target - now

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0 }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return { days, hours, minutes }
  }

  // Admin methods
  getAllOrdersForAdmin(): MarketplaceOrder[] {
    return this.getAllOrders()
  }

  getDisputedOrders(): MarketplaceOrder[] {
    return this.getOrdersByStatus("disputed")
  }

  // Cleanup expired orders
  cleanupExpiredOrders(): void {
    const orders = this.getAllOrders()
    const now = new Date()

    orders.forEach((order) => {
      if (order.status === "awaiting_acceptance" && order.acceptanceDeadline) {
        if (now > new Date(order.acceptanceDeadline)) {
          this.cancelOrder(order.id, "Acceptance window expired")
        }
      } else if (order.status === "delivered" && order.reviewDeadline) {
        if (now > new Date(order.reviewDeadline)) {
          const settings = this.getSettings()
          if (settings.autoReleasePayment) {
            this.releasePayment(order.id, order.buyerId)
          }
        }
      }
    })
  }

  private async createAdminDisputeForOrder(
    order: MarketplaceOrder,
    reason: string,
    details: string,
    createdBy: "buyer" | "seller",
    evidenceFiles?: string[],
  ): Promise<void> {
    try {
      // Import admin dispute functions dynamically to avoid circular dependencies
      const { createAdminDispute } = await import("./admin-disputes")

      const disputeData = {
        jobId: order.id,
        workProofId: `marketplace_${order.id}`,
        workerId: order.sellerId,
        employerId: order.buyerId,
        jobTitle: order.serviceName,
        workerName: `Seller ${order.sellerId}`, // In real app, get actual names
        employerName: `Buyer ${order.buyerId}`,
        amount: order.price,
        reason: reason,
        description: details || reason,
        requestedAction: createdBy === "buyer" ? "refund" : "payment",
        priority: "medium" as const,
        evidenceCount: evidenceFiles?.length || 0,
        evidenceFiles: evidenceFiles || [],
        platform: "marketplace", // Add platform identifier
        createdBy: createdBy, // Track who created the dispute
      }

      await createAdminDispute(disputeData)
      console.log(`[v0] Created admin dispute for marketplace order: ${order.id}`)
    } catch (error) {
      console.error(`[v0] Failed to create admin dispute for order ${order.id}:`, error)
    }
  }

  private async sendOrderNotification(
    order: MarketplaceOrder,
    eventType: string,
    initiatedBy?: "buyer" | "seller",
  ): Promise<void> {
    try {
      const { createNotification } = await import("./notifications")

      switch (eventType) {
        case "order_placed":
          // Notify seller about new order
          await createNotification({
            userId: order.sellerId,
            type: "job",
            title: "🎉 New Order Received!",
            description: `You received a new order for "${order.serviceName}" worth $${order.price}. Please accept or decline within 24 hours.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break

        case "order_accepted":
          // Notify buyer that seller accepted
          await createNotification({
            userId: order.buyerId,
            type: "job",
            title: "✅ Order Accepted!",
            description: `Your order for "${order.serviceName}" has been accepted. The seller will start working on it soon.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break

        case "work_started":
          // Notify buyer that work has started
          await createNotification({
            userId: order.buyerId,
            type: "job",
            title: "🚀 Work Started!",
            description: `The seller has started working on your order "${order.serviceName}". You'll be notified when it's delivered.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break

        case "work_delivered":
          // Notify buyer about delivery
          await createNotification({
            userId: order.buyerId,
            type: "job",
            title: "📦 Work Delivered!",
            description: `Your order "${order.serviceName}" has been delivered! Please review and approve the work to release payment.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })

          // Also notify seller about successful delivery
          await createNotification({
            userId: order.sellerId,
            type: "job",
            title: "✅ Work Delivered Successfully!",
            description: `You've successfully delivered "${order.serviceName}". Waiting for buyer approval to release payment.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break

        case "payment_approved":
          // Notify seller about payment release
          await createNotification({
            userId: order.sellerId,
            type: "payment",
            title: "💰 Payment Released!",
            description: `Payment of $${order.price} has been released for "${order.serviceName}". Funds added to your wallet.`,
            actionUrl: `/dashboard/wallet`,
          })

          // Notify buyer about completion
          await createNotification({
            userId: order.buyerId,
            type: "job",
            title: "✅ Order Completed!",
            description: `Your order "${order.serviceName}" has been completed successfully. Payment has been released to the seller.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break

        case "dispute_created":
          const otherParty = initiatedBy === "buyer" ? order.sellerId : order.buyerId
          const disputeInitiator = initiatedBy === "buyer" ? "buyer" : "seller"

          // Notify the other party about dispute
          await createNotification({
            userId: otherParty,
            type: "system",
            title: "⚠️ Dispute Opened",
            description: `A dispute has been opened for order "${order.serviceName}" by the ${disputeInitiator}. Admin will review and resolve.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })

          // Notify dispute initiator about confirmation
          await createNotification({
            userId: initiatedBy === "buyer" ? order.buyerId : order.sellerId,
            type: "system",
            title: "📋 Dispute Submitted",
            description: `Your dispute for "${order.serviceName}" has been submitted. Admin will review and contact you soon.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break

        case "dispute_resolved":
          const resolution = order.adminDecision === "refund_buyer" ? "in your favor" : "in seller's favor"

          // Notify buyer about resolution
          await createNotification({
            userId: order.buyerId,
            type: "system",
            title: "⚖️ Dispute Resolved",
            description: `The dispute for "${order.serviceName}" has been resolved ${order.adminDecision === "refund_buyer" ? "in your favor. Refund processed." : "in seller's favor. Payment released to seller."}`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })

          // Notify seller about resolution
          await createNotification({
            userId: order.sellerId,
            type: "system",
            title: "⚖️ Dispute Resolved",
            description: `The dispute for "${order.serviceName}" has been resolved ${order.adminDecision === "pay_seller" ? "in your favor. Payment released." : "in buyer's favor. Refund processed."}`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break

        case "order_cancelled":
          // Notify both parties about cancellation
          await createNotification({
            userId: order.buyerId,
            type: "system",
            title: "❌ Order Cancelled",
            description: `Your order "${order.serviceName}" has been cancelled. Full refund has been processed to your wallet.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })

          await createNotification({
            userId: order.sellerId,
            type: "system",
            title: "❌ Order Cancelled",
            description: `Order "${order.serviceName}" has been cancelled. No payment will be processed.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break

        case "deadline_reminder":
          // Notify about approaching deadlines
          if (order.status === "awaiting_acceptance") {
            await createNotification({
              userId: order.sellerId,
              type: "system",
              title: "⏰ Order Expiring Soon",
              description: `Order "${order.serviceName}" expires in 2 hours. Please accept or decline to avoid auto-cancellation.`,
              actionUrl: `/dashboard/orders/${order.id}`,
            })
          } else if (order.status === "delivered") {
            await createNotification({
              userId: order.buyerId,
              type: "system",
              title: "⏰ Review Reminder",
              description: `Please review "${order.serviceName}". Auto-approval in 24 hours if no action taken.`,
              actionUrl: `/dashboard/orders/${order.id}`,
            })
          }
          break

        case "auto_release_warning":
          // Warn buyer about upcoming auto-release
          await createNotification({
            userId: order.buyerId,
            type: "system",
            title: "⏰ Payment Auto-Release Soon",
            description: `Payment for "${order.serviceName}" will be auto-released in 24 hours. Review now if you have concerns.`,
            actionUrl: `/dashboard/orders/${order.id}`,
          })
          break
      }

      console.log(`[v0] Order notification sent: ${eventType} for order ${order.id}`)
    } catch (error) {
      console.error(`[v0] Failed to send order notification: ${eventType}`, error)
    }
  }

  public sendDeadlineReminders(): void {
    const orders = this.getAllOrders()
    const now = new Date()

    orders.forEach((order) => {
      // Check acceptance deadline (2 hours before expiry)
      if (order.status === "awaiting_acceptance" && order.acceptanceDeadline) {
        const deadline = new Date(order.acceptanceDeadline)
        const twoHoursBefore = new Date(deadline.getTime() - 2 * 60 * 60 * 1000)

        if (now >= twoHoursBefore && now < deadline) {
          this.sendOrderNotification(order, "deadline_reminder")
        }
      }

      // Check review deadline (24 hours before auto-release)
      if (order.status === "delivered" && order.reviewDeadline) {
        const deadline = new Date(order.reviewDeadline)
        const oneDayBefore = new Date(deadline.getTime() - 24 * 60 * 60 * 1000)

        if (now >= oneDayBefore && now < deadline) {
          this.sendOrderNotification(order, "auto_release_warning")
        }
      }
    })
  }

  private getNextOrderNumber(): number {
    const stored = localStorage.getItem(this.ORDER_COUNTER_KEY)
    const currentCounter = stored ? Number.parseInt(stored) : 0
    const nextNumber = currentCounter + 1
    localStorage.setItem(this.ORDER_COUNTER_KEY, nextNumber.toString())
    return nextNumber
  }
}

// Export singleton instance
export const marketplaceOrderManager = new MarketplaceOrderManager()

// Helper functions
export const formatOrderStatus = (status: MarketplaceOrder["status"]): string => {
  const statusMap: Record<MarketplaceOrder["status"], string> = {
    awaiting_acceptance: "Awaiting Seller Acceptance",
    pending: "Pending",
    in_progress: "In Progress",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
    dispute_resolved: "Dispute Resolved",
  }
  return statusMap[status] || status
}

export const getOrderStatusColor = (status: MarketplaceOrder["status"]): string => {
  const colorMap: Record<MarketplaceOrder["status"], string> = {
    awaiting_acceptance: "text-yellow-600 bg-yellow-50",
    pending: "text-blue-600 bg-blue-50",
    in_progress: "text-purple-600 bg-purple-50",
    delivered: "text-green-600 bg-green-50",
    completed: "text-green-700 bg-green-100",
    cancelled: "text-red-600 bg-red-50",
    disputed: "text-orange-600 bg-orange-50",
    dispute_resolved: "text-gray-600 bg-gray-50",
  }
  return colorMap[status] || "text-gray-600 bg-gray-50"
}
