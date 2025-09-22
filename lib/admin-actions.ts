export interface AdminAction {
  id: string
  adminId: string
  adminName: string
  actionType: "dispute_resolved" | "payment_processed" | "order_cancelled" | "user_suspended" | "refund_issued"
  targetType: "order" | "user" | "payment" | "dispute"
  targetId: string
  description: string
  details?: {
    decision?: string
    paymentDetails?: {
      buyerRefund?: number
      sellerPayment?: number
      platformFee?: number
      processingFee?: number
    }
    adminNotes?: string
    resolutionReason?: string
    orderAmount?: number
    buyerId?: string
    sellerId?: string
    serviceName?: string
    [key: string]: any
  }
  createdAt: string
}

export async function getAdminActions(filters?: {
  adminId?: string
  actionType?: string
  targetType?: string
  targetId?: string
  limit?: number
}): Promise<AdminAction[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200))

  try {
    const actions = JSON.parse(localStorage.getItem("admin_actions") || "[]") as AdminAction[]

    let filtered = [...actions]

    if (filters?.adminId) {
      filtered = filtered.filter((action) => action.adminId === filters.adminId)
    }

    if (filters?.actionType) {
      filtered = filtered.filter((action) => action.actionType === filters.actionType)
    }

    if (filters?.targetType) {
      filtered = filtered.filter((action) => action.targetType === filters.targetType)
    }

    if (filters?.targetId) {
      filtered = filtered.filter((action) => action.targetId === filters.targetId)
    }

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit)
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.error("Error loading admin actions:", error)
    return []
  }
}

export async function createAdminAction(action: Omit<AdminAction, "id" | "createdAt">): Promise<AdminAction> {
  const newAction: AdminAction = {
    ...action,
    id: `admin_action_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    createdAt: new Date().toISOString(),
  }

  try {
    const existingActions = JSON.parse(localStorage.getItem("admin_actions") || "[]")
    existingActions.unshift(newAction)
    localStorage.setItem("admin_actions", JSON.stringify(existingActions))

    console.log(`[v0] Created admin action: ${newAction.actionType} for ${newAction.targetType} ${newAction.targetId}`)
    return newAction
  } catch (error) {
    console.error("Error creating admin action:", error)
    throw error
  }
}
