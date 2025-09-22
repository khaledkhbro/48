"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { marketplaceOrderManager, formatOrderStatus, type MarketplaceOrder } from "@/lib/marketplace-orders"
import type { AdminAction } from "@/lib/admin-actions"
import {
  Search,
  Filter,
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Eye,
  MessageCircle,
  Settings,
  Download,
  Truck,
  Shield,
  FileText,
  History,
  CreditCard,
  User,
  Scale,
  MessageSquare,
  ImageIcon,
  X,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface EnhancedDisputeResolution {
  decision: "refund_buyer" | "pay_seller" | "partial_refund"
  adminId: string
  adminName: string
  adminNotes: string
  paymentDetails: {
    buyerRefund?: number
    sellerPayment?: number
    platformFee?: number
    processingFee?: number
  }
  evidenceReviewed: string[]
  resolutionReason: string
  resolvedAt: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [adminActions, setAdminActions] = useState<AdminAction[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [resolutionReason, setResolutionReason] = useState("")
  const [filteredOrders, setFilteredOrders] = useState<MarketplaceOrder[]>([])
  const [showAdminHistory, setShowAdminHistory] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedDispute, setSelectedDispute] = useState<MarketplaceOrder | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Order settings
  const [orderSettings, setOrderSettings] = useState({
    acceptanceWindowHours: 24,
    reviewPeriodDays: 3,
    autoReleasePayment: true,
  })

  const [viewingFile, setViewingFile] = useState<{
    name: string
    url: string
    type: string
  } | null>(null)

  const handleViewFile = (file: any, index: number) => {
    console.log("[v0] Viewing evidence file:", file)

    let fileUrl = ""
    let fileName = ""
    let fileType = ""

    if (typeof file === "string") {
      fileName = file
      fileType = "document"
      // For string filenames, we can't view the actual file
      alert(
        `File: ${fileName}\n\nNote: This is a filename reference only. The actual file content is not available for viewing in this demo.`,
      )
      return
    } else if (file?.name) {
      fileName = file.name
      fileType = file.type || "document"
      fileUrl = file.url || file.preview || ""
    } else {
      fileName = `Evidence ${index + 1}`
      fileType = "document"
    }

    if (fileUrl && fileUrl.startsWith("blob:")) {
      // For blob URLs, we can display the file
      setViewingFile({
        name: fileName,
        url: fileUrl,
        type: fileType,
      })
    } else {
      alert(
        `File: ${fileName}\nType: ${fileType}\n\nNote: File content is not available for viewing. In a production environment, this would download or display the file from cloud storage.`,
      )
    }
  }

  const loadSettings = () => {
    // TODO: Implement load settings
  }

  const loadAdminActions = () => {
    try {
      const storedActions = localStorage.getItem("admin_actions")
      const parsedActions = storedActions ? JSON.parse(storedActions) : []
      setAdminActions(parsedActions)
      console.log("[v0] Loaded admin actions:", parsedActions.length)
    } catch (error) {
      console.error("[v0] Error loading admin actions:", error)
    }
  }

  useEffect(() => {
    loadOrders()
    loadAdminActions()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const allOrders = marketplaceOrderManager.getAllOrdersForAdmin()
      console.log("[v0] Loaded admin orders:", allOrders.length)

      setOrders(allOrders)
    } catch (error) {
      console.error("[v0] Error loading admin orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.serviceName.toLowerCase().includes(search) ||
          order.id.toLowerCase().includes(search) ||
          order.buyerId.toLowerCase().includes(search) ||
          order.sellerId.toLowerCase().includes(search),
      )
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredOrders(filtered)
  }

  const handleResolveDispute = async (decision: "refund_buyer" | "pay_seller" | "partial_refund") => {
    if (!selectedDispute) {
      alert("No dispute selected")
      return
    }

    if (!adminNotes.trim() || !resolutionReason.trim()) {
      alert("Please provide both admin notes and resolution reason for audit trail")
      return
    }

    setActionLoading(selectedDispute.id)
    try {
      const order = orders.find((o) => o.id === selectedDispute.id)
      if (!order) {
        throw new Error("Order not found")
      }

      // Calculate payment details based on decision
      const paymentDetails = {
        buyerRefund: decision === "refund_buyer" ? order.price : decision === "partial_refund" ? order.price * 0.5 : 0,
        sellerPayment:
          decision === "pay_seller" ? order.price * 0.95 : decision === "partial_refund" ? order.price * 0.45 : 0, // 5% platform fee
        platformFee: order.price * 0.05,
        processingFee: 0,
      }

      // Create enhanced resolution record
      const enhancedResolution: EnhancedDisputeResolution = {
        decision,
        adminId: "admin-user", // In real app, get from auth
        adminName: "System Administrator", // In real app, get from auth
        adminNotes,
        paymentDetails,
        evidenceReviewed: ["dispute_message", "order_history", "user_communications"],
        resolutionReason,
        resolvedAt: new Date().toISOString(),
      }

      // Log admin action for audit trail
      const adminAction: AdminAction = {
        id: `admin_action_${Date.now()}`,
        adminId: enhancedResolution.adminId,
        adminName: enhancedResolution.adminName,
        actionType: "dispute_resolved",
        targetType: "order",
        targetId: selectedDispute.id,
        description: `Resolved dispute for order ${selectedDispute.id.slice(-8)} - ${decision.replace("_", " ")}`,
        details: {
          decision,
          paymentDetails,
          adminNotes,
          resolutionReason,
          orderAmount: order.price,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          serviceName: order.serviceName,
        },
        createdAt: new Date().toISOString(),
      }

      // Save admin action to localStorage for tracking
      const existingActions = JSON.parse(localStorage.getItem("admin_actions") || "[]")
      existingActions.unshift(adminAction)
      localStorage.setItem("admin_actions", JSON.stringify(existingActions))

      try {
        console.log(`[v0] Syncing dispute resolution with admin disputes system for order: ${selectedDispute.id}`)

        // Find existing admin dispute for this order
        const { getAdminDisputes, resolveDispute: resolveAdminDispute } = await import("@/lib/admin-disputes")
        const existingDisputes = await getAdminDisputes({ platform: "marketplace" })
        const relatedDispute = existingDisputes.find((d) => d.jobId === selectedDispute.id && d.status !== "resolved")

        if (relatedDispute) {
          console.log(`[v0] Found related admin dispute: ${relatedDispute.id}, resolving it`)

          // Map marketplace decisions to admin dispute decisions
          let adminDecision: "approve_worker" | "approve_employer" | "partial_refund"
          switch (decision) {
            case "pay_seller":
              adminDecision = "approve_worker"
              break
            case "refund_buyer":
              adminDecision = "approve_employer"
              break
            case "partial_refund":
            default:
              adminDecision = "partial_refund"
              break
          }

          await resolveAdminDispute(relatedDispute.id, {
            decision: adminDecision,
            adminNotes: `${adminNotes}\n\nResolution Reason: ${resolutionReason}`,
            adminId: enhancedResolution.adminId,
          })

          console.log(`[v0] Successfully synced admin dispute resolution`)

          window.dispatchEvent(
            new CustomEvent("disputeResolved", {
              detail: { orderId: selectedDispute.id, decision, disputeId: relatedDispute.id },
            }),
          )
        } else {
          console.log(`[v0] No related admin dispute found for order: ${selectedDispute.id}`)
        }
      } catch (syncError) {
        console.error(`[v0] Error syncing with admin disputes system:`, syncError)
        // Don't fail the main resolution if sync fails
      }

      const success = marketplaceOrderManager.resolveDispute(
        selectedDispute.id,
        enhancedResolution.adminId,
        decision,
        adminNotes,
        enhancedResolution,
      )

      if (success) {
        loadOrders()
        loadAdminActions()
        setSelectedOrder(null)
        setAdminNotes("")
        setResolutionReason("")
        setSelectedDispute(null)

        const actionSummary =
          decision === "refund_buyer"
            ? `Buyer refunded $${paymentDetails.buyerRefund?.toFixed(2)}`
            : decision === "pay_seller"
              ? `Seller paid $${paymentDetails.sellerPayment?.toFixed(2)} (after 5% platform fee)`
              : `Partial resolution: Buyer refunded $${paymentDetails.buyerRefund?.toFixed(2)}, Seller paid $${paymentDetails.sellerPayment?.toFixed(2)}`

        alert(`Dispute resolved successfully!\n\n${actionSummary}\n\nAdmin action logged for audit trail.`)
      } else {
        alert("Failed to resolve dispute. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error resolving dispute:", error)
      alert("Failed to resolve dispute. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateSettings = () => {
    marketplaceOrderManager.updateSettings(orderSettings)
    alert("Order settings updated successfully!")
  }

  const exportOrders = () => {
    const csvContent = [
      ["Order ID", "Service", "Buyer", "Seller", "Status", "Price", "Created", "Completed"].join(","),
      ...filteredOrders.map((order) =>
        [
          order.id,
          `"${order.serviceName}"`,
          order.buyerId,
          order.sellerId,
          order.status,
          order.price,
          safeFormatDate(order.createdAt),
          order.completedAt ? safeFormatDate(order.completedAt) : "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `marketplace-orders-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getTimeRemaining = (deadline: string) => {
    const remaining = marketplaceOrderManager.getTimeRemaining(deadline)
    if (remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0) {
      return "Expired"
    }
    if (remaining.days > 0) {
      return `${remaining.days}d ${remaining.hours}h`
    }
    if (remaining.hours > 0) {
      return `${remaining.hours}h ${remaining.minutes}m`
    }
    return `${remaining.minutes}m`
  }

  const disputedOrders = orders.filter((order) => order.status === "disputed")
  const awaitingOrders = orders.filter((order) => order.status === "awaiting")
  const activeOrders = orders.filter((order) => order.status === "active")

  const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0)

  // Helper function to safely format dates
  const safeFormatDistanceToNow = (dateValue: string | Date | undefined | null) => {
    if (!dateValue) return "Unknown"

    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return "Invalid date"

    try {
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error("[v0] Date formatting error:", error, "for value:", dateValue)
      return "Unknown"
    }
  }

  // Helper function to safely format date strings
  const safeFormatDate = (dateValue: string | Date | undefined | null) => {
    if (!dateValue) return "Unknown"

    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return "Invalid date"

    try {
      return date.toLocaleDateString()
    } catch (error) {
      console.error("[v0] Date formatting error:", error, "for value:", dateValue)
      return "Unknown"
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "awaiting_acceptance":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "in_progress":
        return "bg-indigo-100 text-indigo-800 border-indigo-200"
      case "delivered":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "disputed":
        return "bg-red-100 text-red-800 border-red-200"
      case "dispute_resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getOrderAdminActions = (orderId: string) => {
    return adminActions
      .filter((action) => action.targetType === "order" && action.targetId === orderId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const handleCancelOrder = async (orderId: string, reason: string) => {
    setActionLoading(orderId)
    try {
      const success = marketplaceOrderManager.cancelOrder(orderId, reason)
      if (success) {
        loadOrders()
        setSelectedOrder(null)
        alert(`Order cancelled successfully. Reason: ${reason}`)
      } else {
        alert("Failed to cancel order. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error cancelling order:", error)
      alert("Failed to cancel order. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId)
    try {
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        alert("Order not found")
        return
      }

      // Update order status based on admin action
      let success = false
      if (newStatus === "force_complete") {
        success = marketplaceOrderManager.releasePayment(orderId, order.buyerId)
      } else if (newStatus === "force_refund") {
        success = marketplaceOrderManager.cancelOrder(orderId, "Admin forced refund")
      }

      if (success) {
        loadOrders()
        setSelectedOrder(null)
        alert(`Order status updated successfully`)
      } else {
        alert("Failed to update order status")
      }
    } catch (error) {
      console.error("[v0] Error updating order status:", error)
      alert("Failed to update order status")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    loadOrders()
    loadAdminActions()
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  const handleExport = () => {
    exportOrders()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-sm text-gray-600 mt-1">Monitor and manage all marketplace orders</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button variant="outline" size="sm" onClick={() => setShowAdminHistory(true)} className="w-full sm:w-auto">
              <History className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">View Full History</span>
              <span className="sm:hidden">History</span>
            </Button>
            <Button onClick={handleRefresh} disabled={isLoading} size="sm" className="w-full sm:w-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <Card>
            <CardContent className="flex items-center p-3 sm:p-4 lg:p-6">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{orders.length}</p>
                <p className="text-xs sm:text-sm text-gray-600">Total Orders</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-3 sm:p-4 lg:p-6">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-yellow-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{awaitingOrders.length}</p>
                <p className="text-xs sm:text-sm text-gray-600">Awaiting</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-3 sm:p-4 lg:p-6">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{activeOrders.length}</p>
                <p className="text-xs sm:text-sm text-gray-600">Active</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-3 sm:p-4 lg:p-6">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs sm:text-sm text-gray-600">Delivered</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.open("/admin/disputes/marketplace", "_blank")}
          >
            <CardContent className="flex items-center p-3 sm:p-4 lg:p-6">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-red-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">2</p>
                <p className="text-xs sm:text-sm text-gray-600">Disputes</p>
                <p className="text-xs text-blue-600 mt-1">Tap to manage →</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-3 sm:p-4 lg:p-6">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">$50.00</p>
                <p className="text-xs sm:text-sm text-gray-600">Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-lg sm:text-xl">Admin Actions Summary</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdminHistory(true)}
                className="w-full sm:w-auto"
              >
                <History className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">View Full History</span>
                <span className="sm:hidden">History</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Actions</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-900">{adminActions.length}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-green-200">
                <p className="text-xs sm:text-sm text-green-600 font-medium">Disputes Resolved</p>
                <p className="text-lg sm:text-2xl font-bold text-green-900">
                  {adminActions.filter((a) => a.actionType === "dispute_resolved").length}
                </p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-purple-200">
                <p className="text-xs sm:text-sm text-purple-600 font-medium">Payments Processed</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-900">
                  {adminActions.filter((a) => a.actionType === "payment_processed").length}
                </p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg border border-orange-200">
                <p className="text-xs sm:text-sm text-orange-600 font-medium">Recent (24h)</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-900">
                  {
                    adminActions.filter((a) => {
                      const actionDate = new Date(a.createdAt)
                      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
                      return actionDate > yesterday
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">Order Management</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md mx-auto">
                    <DialogHeader>
                      <DialogTitle>Order Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Acceptance Window (hours)</label>
                        <Input
                          type="number"
                          value={orderSettings.acceptanceWindowHours}
                          onChange={(e) =>
                            setOrderSettings({
                              ...orderSettings,
                              acceptanceWindowHours: Number(e.target.value),
                            })
                          }
                          min="1"
                          max="168"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Review Period (days)</label>
                        <Input
                          type="number"
                          value={orderSettings.reviewPeriodDays}
                          onChange={(e) =>
                            setOrderSettings({
                              ...orderSettings,
                              reviewPeriodDays: Number(e.target.value),
                            })
                          }
                          min="1"
                          max="30"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="autoRelease"
                          checked={orderSettings.autoReleasePayment}
                          onChange={(e) =>
                            setOrderSettings({
                              ...orderSettings,
                              autoReleasePayment: e.target.checked,
                            })
                          }
                        />
                        <label htmlFor="autoRelease" className="text-sm">
                          Auto-release payment after review period
                        </label>
                      </div>
                      <Button onClick={handleUpdateSettings} className="w-full">
                        Update Settings
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={handleExport} variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">Export</span>
                </Button>
                <Button onClick={handleRefresh} disabled={isLoading} size="sm" className="w-full sm:w-auto">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">Refresh</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="awaiting_acceptance">Awaiting Acceptance</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  All ({filteredOrders.length})
                </TabsTrigger>
                <TabsTrigger value="awaiting" className="text-xs sm:text-sm">
                  Awaiting ({awaitingOrders.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs sm:text-sm">
                  Active ({activeOrders.length})
                </TabsTrigger>
              </TabsList>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No orders found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-blue-600">{order.id}</span>
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 truncate max-w-xs">
                                  {order.serviceName || "Unknown Service"}
                                </div>
                                <div className="text-sm text-gray-500">Order {order.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {order.buyerId.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{order.buyerId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {order.sellerId.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{order.sellerId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeStyle(order.status)} font-medium`}>
                              {formatOrderStatus(order.status)}
                            </Badge>
                            {order.acceptanceDeadline && order.status === "awaiting_acceptance" && (
                              <div className="text-xs text-gray-500 mt-1">
                                Expires: {getTimeRemaining(order.acceptanceDeadline)}
                              </div>
                            )}
                            {order.reviewDeadline && order.status === "delivered" && (
                              <div className="text-xs text-gray-500 mt-1">
                                Review: {getTimeRemaining(order.reviewDeadline)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">${order.price}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{safeFormatDate(order.createdAt)}</div>
                            <div className="text-xs text-gray-500">{safeFormatDistanceToNow(order.createdAt)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Order Details</DialogTitle>
                                  </DialogHeader>
                                  {selectedOrder && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Order ID</label>
                                          <p className="font-mono text-sm">{selectedOrder.id}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Status</label>
                                          <Badge className={`${getStatusBadgeStyle(selectedOrder.status)} font-medium`}>
                                            {formatOrderStatus(selectedOrder.status)}
                                          </Badge>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Service</label>
                                          <p>{selectedOrder.serviceName}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Price</label>
                                          <p className="font-semibold text-green-600">${selectedOrder.price}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Buyer</label>
                                          <p>{selectedOrder.buyerId}</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Seller</label>
                                          <p>{selectedOrder.sellerId}</p>
                                        </div>
                                      </div>

                                      {selectedOrder.requirements && (
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Requirements</label>
                                          <p className="text-sm bg-gray-50 p-3 rounded mt-1">
                                            {selectedOrder.requirements}
                                          </p>
                                        </div>
                                      )}

                                      {selectedOrder.deliverables && (
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Deliverables</label>
                                          <div className="bg-gray-50 p-3 rounded mt-1">
                                            <p className="text-sm">{selectedOrder.deliverables.message}</p>
                                            {selectedOrder.deliverables.files.length > 0 && (
                                              <p className="text-xs text-gray-500 mt-2">
                                                {selectedOrder.deliverables.files.length} file(s) attached
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {selectedOrder.status === "disputed" && (
                                        <div className="space-y-4 border-t pt-4">
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Dispute Reason</label>
                                            <p className="text-sm">{selectedOrder.disputeReason}</p>
                                          </div>
                                          {selectedOrder.disputeDetails && (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">Details</label>
                                              <p className="text-sm bg-red-50 p-3 rounded mt-1">
                                                {selectedOrder.disputeDetails}
                                              </p>
                                            </div>
                                          )}

                                          {selectedOrder.disputeEvidenceFiles &&
                                            selectedOrder.disputeEvidenceFiles.length > 0 && (
                                              <div>
                                                <p className="text-sm font-medium text-gray-700 mb-3">
                                                  Evidence Files ({selectedOrder.disputeEvidenceFiles.length}):
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                  {selectedOrder.disputeEvidenceFiles.map((file, index) => {
                                                    const fileName =
                                                      typeof file === "string"
                                                        ? file
                                                        : file?.name || `Evidence ${index + 1}`
                                                    const isImage =
                                                      fileName.toLowerCase().includes("image") ||
                                                      fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                                    return (
                                                      <Card key={index} className="border border-gray-200">
                                                        <CardContent className="p-3">
                                                          <div className="flex items-center space-x-3">
                                                            <div className="flex-shrink-0">
                                                              {isImage ? (
                                                                <div className="w-12 h-12 bg-blue-50 rounded flex items-center justify-center">
                                                                  <ImageIcon className="h-6 w-6 text-blue-600" />
                                                                </div>
                                                              ) : (
                                                                <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center">
                                                                  <FileText className="h-6 w-6 text-gray-600" />
                                                                </div>
                                                              )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                              <p className="text-sm font-medium text-gray-900 truncate">
                                                                {fileName}
                                                              </p>
                                                              <p className="text-xs text-gray-500">
                                                                {isImage ? "Image file" : "Document file"}
                                                              </p>
                                                            </div>
                                                            <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              className="h-8 w-8 p-0"
                                                              title="View evidence"
                                                              onClick={() => handleViewFile(file, index)}
                                                            >
                                                              <Eye className="h-4 w-4" />
                                                            </Button>
                                                          </div>
                                                        </CardContent>
                                                      </Card>
                                                    )
                                                  })}
                                                </div>
                                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                  <p className="text-xs text-blue-700">
                                                    <strong>Note:</strong> Evidence files were uploaded by the disputing
                                                    party to support their claim.
                                                  </p>
                                                </div>
                                              </div>
                                            )}

                                          <div className="space-y-4">
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">
                                                Resolution Reason (Required)
                                              </label>
                                              <Select value={resolutionReason} onValueChange={setResolutionReason}>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Work quality does not meet requirements" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="work_quality_unacceptable">
                                                    Work quality does not meet requirements
                                                  </SelectItem>
                                                  <SelectItem value="incomplete_delivery">
                                                    Incomplete or missing deliverables
                                                  </SelectItem>
                                                  <SelectItem value="communication_issues">
                                                    Poor communication or unresponsive
                                                  </SelectItem>
                                                  <SelectItem value="deadline_missed">
                                                    Missed agreed deadline
                                                  </SelectItem>
                                                  <SelectItem value="requirements_mismatch">
                                                    Deliverables don't match requirements
                                                  </SelectItem>
                                                  <SelectItem value="other">Other (specify in notes)</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            <div>
                                              <label className="text-sm font-medium text-gray-600">
                                                Admin Decision Notes (Required)
                                              </label>
                                              <Textarea
                                                placeholder="ok"
                                                value={adminNotes}
                                                onChange={(e) => setAdminNotes(e.target.value)}
                                                rows={4}
                                              />
                                            </div>

                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                Payment Breakdown Preview
                                              </h4>
                                              <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="bg-white p-3 rounded border border-blue-300">
                                                  <p className="font-medium text-blue-800 mb-2">If Refund Buyer:</p>
                                                  <p className="text-blue-700">
                                                    • Buyer receives: ${selectedOrder.price.toFixed(2)}
                                                  </p>
                                                  <p className="text-blue-700">• Seller receives: $0.00</p>
                                                  <p className="text-blue-700">• Platform fee: $0.00</p>
                                                </div>
                                                <div className="bg-white p-3 rounded border border-blue-300">
                                                  <p className="font-medium text-blue-800 mb-2">If Pay Seller:</p>
                                                  <p className="text-blue-700">• Buyer receives: $0.00</p>
                                                  <p className="text-blue-700">
                                                    • Seller receives: ${(selectedOrder.price * 0.95).toFixed(2)}
                                                  </p>
                                                  <p className="text-blue-700">
                                                    • Platform fee: ${(selectedOrder.price * 0.05).toFixed(2)}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <Alert>
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>
                                              Choose your decision carefully. This action will be logged in the admin
                                              audit trail and cannot be undone.
                                            </AlertDescription>
                                          </Alert>

                                          <div className="flex justify-end space-x-3">
                                            <Button
                                              onClick={() => handleResolveDispute("refund_buyer")}
                                              disabled={actionLoading === selectedOrder.id || !adminNotes.trim()}
                                              className="bg-blue-600 hover:bg-blue-700"
                                            >
                                              {actionLoading === selectedOrder.id ? (
                                                <>
                                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                  Processing...
                                                </>
                                              ) : (
                                                <>
                                                  <User className="mr-2 h-4 w-4" />
                                                  Refund Buyer
                                                </>
                                              )}
                                            </Button>
                                            <Button
                                              onClick={() => handleResolveDispute("pay_seller")}
                                              disabled={actionLoading === selectedOrder.id || !adminNotes.trim()}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              {actionLoading === selectedOrder.id ? (
                                                <>
                                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                  Processing...
                                                </>
                                              ) : (
                                                <>
                                                  <DollarSign className="mr-2 h-4 w-4" />
                                                  Pay Seller
                                                </>
                                              )}
                                            </Button>
                                            <Button
                                              onClick={() => handleResolveDispute("partial_refund")}
                                              disabled={actionLoading === selectedOrder.id || !adminNotes.trim()}
                                              className="bg-purple-600 hover:bg-purple-700"
                                            >
                                              {actionLoading === selectedOrder.id ? (
                                                <>
                                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                  Processing...
                                                </>
                                              ) : (
                                                <>
                                                  <Scale className="mr-2 h-4 w-4" />
                                                  Partial Refund
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {selectedOrder.status === "dispute_resolved" && selectedOrder.resolution && (
                                        <div className="bg-green-100 p-4 rounded-lg mb-4 border border-green-200">
                                          <h4 className="font-medium mb-2 text-green-800 flex items-center">
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Resolution Details
                                          </h4>
                                          <div className="space-y-2">
                                            <p className="text-sm text-green-700">
                                              <strong>Admin Decision:</strong>{" "}
                                              {selectedOrder.resolution.decision === "refund_buyer"
                                                ? "Approved Buyer - Full Refund"
                                                : selectedOrder.resolution.decision === "pay_seller"
                                                  ? "Approved Seller - No Refund"
                                                  : "Partial Refund Applied"}
                                            </p>

                                            {selectedOrder.resolution.paymentDetails && (
                                              <div className="bg-white p-3 rounded border border-green-300">
                                                <p className="text-sm font-medium text-green-800 mb-2">
                                                  Payment Breakdown:
                                                </p>
                                                {selectedOrder.resolution.paymentDetails.buyerRefund > 0 && (
                                                  <p className="text-sm text-green-700">
                                                    • Buyer refunded: $
                                                    {selectedOrder.resolution.paymentDetails.buyerRefund.toFixed(2)}
                                                  </p>
                                                )}
                                                {selectedOrder.resolution.paymentDetails.sellerPayment > 0 && (
                                                  <p className="text-sm text-green-700">
                                                    • Seller paid: $
                                                    {selectedOrder.resolution.paymentDetails.sellerPayment.toFixed(2)}
                                                  </p>
                                                )}
                                                {selectedOrder.resolution.paymentDetails.platformFee > 0 && (
                                                  <p className="text-sm text-green-700">
                                                    • Platform fee: $
                                                    {selectedOrder.resolution.paymentDetails.platformFee.toFixed(2)}
                                                  </p>
                                                )}
                                              </div>
                                            )}

                                            {selectedOrder.resolution.resolutionReason && (
                                              <p className="text-sm text-green-700">
                                                <strong>Resolution Reason:</strong>{" "}
                                                {selectedOrder.resolution.resolutionReason}
                                              </p>
                                            )}
                                            {selectedOrder.resolution.adminNotes && (
                                              <p className="text-sm text-green-700">
                                                <strong>Admin Notes:</strong> {selectedOrder.resolution.adminNotes}
                                              </p>
                                            )}
                                            <p className="text-sm text-green-700">
                                              <strong>Resolved by:</strong>{" "}
                                              {selectedOrder.resolution.adminName ||
                                                selectedOrder.resolution.resolvedBy}
                                            </p>
                                            <p className="text-sm text-green-700">
                                              <strong>Resolved on:</strong>{" "}
                                              {safeFormatDate(selectedOrder.resolution.resolvedAt)}
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {selectedOrder.messages && selectedOrder.messages.length > 0 && (
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Messages</label>
                                          <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded mt-1 space-y-2">
                                            {selectedOrder.messages.map((message) => (
                                              <div key={message.id} className="text-sm">
                                                <div className="flex items-center space-x-2 mb-1">
                                                  <Badge variant="outline" className="text-xs">
                                                    {message.senderType}
                                                  </Badge>
                                                  <span className="text-xs text-gray-500">
                                                    {safeFormatDistanceToNow(message.timestamp)}
                                                  </span>
                                                </div>
                                                <p>{message.message}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button variant="outline" size="sm">
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">{order.serviceName}</div>
                          <div className="text-xs text-gray-500">#{order.sequentialId}</div>
                        </div>
                        <Badge className={`${getStatusBadgeStyle(order.status)} text-xs`}>
                          {formatOrderStatus(order.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Buyer:</span>
                          <div className="font-medium">{order.buyerId.slice(0, 8)}...</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Seller:</span>
                          <div className="font-medium">{order.sellerId.slice(0, 8)}...</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-green-600">${order.price}</span>
                          <div className="text-xs text-gray-500">{safeFormatDistanceToNow(order.createdAt)}</div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Order Details</DialogTitle>
                              </DialogHeader>
                              {selectedOrder && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Order ID</label>
                                      <p className="font-mono text-sm">{selectedOrder.id}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Status</label>
                                      <Badge className={`${getStatusBadgeStyle(selectedOrder.status)} font-medium`}>
                                        {formatOrderStatus(selectedOrder.status)}
                                      </Badge>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Service</label>
                                      <p>{selectedOrder.serviceName}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Price</label>
                                      <p className="font-semibold text-green-600">${selectedOrder.price}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Buyer</label>
                                      <p>{selectedOrder.buyerId}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Seller</label>
                                      <p>{selectedOrder.sellerId}</p>
                                    </div>
                                  </div>

                                  {selectedOrder.requirements && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Requirements</label>
                                      <p className="text-sm bg-gray-50 p-3 rounded mt-1">
                                        {selectedOrder.requirements}
                                      </p>
                                    </div>
                                  )}

                                  {selectedOrder.deliverables && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Deliverables</label>
                                      <div className="bg-gray-50 p-3 rounded mt-1">
                                        <p className="text-sm">{selectedOrder.deliverables.message}</p>
                                        {selectedOrder.deliverables.files.length > 0 && (
                                          <p className="text-xs text-gray-500 mt-2">
                                            {selectedOrder.deliverables.files.length} file(s) attached
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {selectedOrder.status === "disputed" && (
                                    <div className="space-y-4 border-t pt-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-600">Dispute Reason</label>
                                        <p className="text-sm">{selectedOrder.disputeReason}</p>
                                      </div>
                                      {selectedOrder.disputeDetails && (
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">Details</label>
                                          <p className="text-sm bg-red-50 p-3 rounded mt-1">
                                            {selectedOrder.disputeDetails}
                                          </p>
                                        </div>
                                      )}

                                      <div className="space-y-4">
                                        <div>
                                          <label className="text-sm font-medium text-gray-600">
                                            Resolution Reason (Required)
                                          </label>
                                          <Select value={resolutionReason} onValueChange={setResolutionReason}>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Work quality does not meet requirements" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="work_quality_unacceptable">
                                                Work quality does not meet requirements
                                              </SelectItem>
                                              <SelectItem value="incomplete_delivery">
                                                Incomplete or missing deliverables
                                              </SelectItem>
                                              <SelectItem value="communication_issues">
                                                Poor communication or unresponsive
                                              </SelectItem>
                                              <SelectItem value="deadline_missed">Missed agreed deadline</SelectItem>
                                              <SelectItem value="requirements_mismatch">
                                                Deliverables don't match requirements
                                              </SelectItem>
                                              <SelectItem value="other">Other (specify in notes)</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div>
                                          <label className="text-sm font-medium text-gray-600">
                                            Admin Decision Notes (Required)
                                          </label>
                                          <Textarea
                                            placeholder="ok"
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            rows={4}
                                          />
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                          <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Payment Breakdown Preview
                                          </h4>
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-white p-3 rounded border border-blue-300">
                                              <p className="font-medium text-blue-800 mb-2">If Refund Buyer:</p>
                                              <p className="text-blue-700">
                                                • Buyer receives: ${selectedOrder.price.toFixed(2)}
                                              </p>
                                              <p className="text-blue-700">• Seller receives: $0.00</p>
                                              <p className="text-blue-700">• Platform fee: $0.00</p>
                                            </div>
                                            <div className="bg-white p-3 rounded border border-blue-300">
                                              <p className="font-medium text-blue-800 mb-2">If Pay Seller:</p>
                                              <p className="text-blue-700">• Buyer receives: $0.00</p>
                                              <p className="text-blue-700">
                                                • Seller receives: ${(selectedOrder.price * 0.95).toFixed(2)}
                                              </p>
                                              <p className="text-blue-700">
                                                • Platform fee: ${(selectedOrder.price * 0.05).toFixed(2)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>
                                          Choose your decision carefully. This action will be logged in the admin audit
                                          trail and cannot be undone.
                                        </AlertDescription>
                                      </Alert>

                                      <div className="flex justify-end space-x-3">
                                        <Button
                                          onClick={() => handleResolveDispute("refund_buyer")}
                                          disabled={actionLoading === selectedOrder.id || !adminNotes.trim()}
                                          className="bg-blue-600 hover:bg-blue-700"
                                        >
                                          {actionLoading === selectedOrder.id ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                              Processing...
                                            </>
                                          ) : (
                                            <>
                                              <User className="mr-2 h-4 w-4" />
                                              Refund Buyer
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          onClick={() => handleResolveDispute("pay_seller")}
                                          disabled={actionLoading === selectedOrder.id || !adminNotes.trim()}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          {actionLoading === selectedOrder.id ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                              Processing...
                                            </>
                                          ) : (
                                            <>
                                              <DollarSign className="mr-2 h-4 w-4" />
                                              Pay Seller
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          onClick={() => handleResolveDispute("partial_refund")}
                                          disabled={actionLoading === selectedOrder.id || !adminNotes.trim()}
                                          className="bg-purple-600 hover:bg-purple-700"
                                        >
                                          {actionLoading === selectedOrder.id ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                              Processing...
                                            </>
                                          ) : (
                                            <>
                                              <Scale className="mr-2 h-4 w-4" />
                                              Partial Refund
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {selectedOrder.messages && selectedOrder.messages.length > 0 && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Messages</label>
                                      <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded mt-1 space-y-2">
                                        {selectedOrder.messages.map((message) => (
                                          <div key={message.id} className="text-sm">
                                            <div className="flex items-center space-x-2 mb-1">
                                              <Badge variant="outline" className="text-xs">
                                                {message.senderType}
                                              </Badge>
                                              <span className="text-xs text-gray-500">
                                                {safeFormatDistanceToNow(message.timestamp)}
                                              </span>
                                            </div>
                                            <p>{message.message}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {order.status === "disputed" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedDispute(order)}>
                                  <MessageSquare className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="text-lg">Resolve Order Dispute</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Dispute Reason</h3>
                                    <p className="text-sm text-gray-700">{order.disputeReason}</p>
                                  </div>

                                  <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Details</h3>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <p className="text-sm text-gray-700">{order.disputeDetails}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Resolution Reason (Required)
                                    </label>
                                    <Select value={resolutionReason} onValueChange={setResolutionReason}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select resolution reason" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="work_quality_unacceptable">
                                          Work quality unacceptable
                                        </SelectItem>
                                        <SelectItem value="work_quality_acceptable">Work quality acceptable</SelectItem>
                                        <SelectItem value="requirements_unclear">Requirements unclear</SelectItem>
                                        <SelectItem value="communication_issues">Communication issues</SelectItem>
                                        <SelectItem value="delivery_late">Delivery late</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Admin Decision Notes (Required)
                                    </label>
                                    <textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Explain your decision, evidence reviewed, and reasoning..."
                                      className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 text-sm"
                                    />
                                  </div>

                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center mb-3">
                                      <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                                      <h3 className="font-medium text-blue-900">Payment Breakdown Preview</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <h4 className="font-medium text-blue-800 mb-2">If Refund Buyer:</h4>
                                        <ul className="space-y-1 text-blue-700">
                                          <li>• Buyer receives: ${order.price}</li>
                                          <li>• Seller receives: $0.00</li>
                                          <li>• Platform fee: $0.00</li>
                                        </ul>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-blue-800 mb-2">If Pay Seller:</h4>
                                        <ul className="space-y-1 text-blue-700">
                                          <li>• Buyer receives: $0.00</li>
                                          <li>• Seller receives: ${(order.price * 0.95).toFixed(2)}</li>
                                          <li>• Platform fee: ${(order.price * 0.05).toFixed(2)}</li>
                                        </ul>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <div className="flex items-start">
                                      <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                      <p className="text-sm text-yellow-800">
                                        Choose your decision carefully. This action will be logged in the admin audit
                                        trail and cannot be undone.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <Button
                                      onClick={() => handleResolveDispute("refund_buyer")}
                                      disabled={!resolutionReason || !adminNotes.trim()}
                                      className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700"
                                    >
                                      <User className="mr-2 h-4 w-4" />
                                      Refund Buyer
                                    </Button>
                                    <Button
                                      onClick={() => handleResolveDispute("pay_seller")}
                                      disabled={!resolutionReason || !adminNotes.trim()}
                                      className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                      <DollarSign className="mr-2 h-4 w-4" />
                                      Pay Seller
                                    </Button>
                                    <Button
                                      onClick={() => handleResolveDispute("partial_refund")}
                                      disabled={!resolutionReason || !adminNotes.trim()}
                                      variant="outline"
                                      className="w-full sm:flex-1"
                                    >
                                      <CreditCard className="mr-2 h-4 w-4" />
                                      Partial Refund
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {selectedDispute && (
        <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Resolve Order Dispute</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Dispute Reason</h3>
                <p className="text-sm text-gray-700">{selectedDispute.disputeReason}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Details</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedDispute.disputeDetails}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Reason (Required)</label>
                <Select value={resolutionReason} onValueChange={setResolutionReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work_quality_unacceptable">Work quality unacceptable</SelectItem>
                    <SelectItem value="work_quality_acceptable">Work quality acceptable</SelectItem>
                    <SelectItem value="requirements_unclear">Requirements unclear</SelectItem>
                    <SelectItem value="communication_issues">Communication issues</SelectItem>
                    <SelectItem value="delivery_late">Delivery late</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Decision Notes (Required)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain your decision, evidence reviewed, and reasoning..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Payment Breakdown Preview</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">If Refund Buyer:</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Buyer receives: ${selectedDispute.price}</li>
                      <li>• Seller receives: $0.00</li>
                      <li>• Platform fee: $0.00</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">If Pay Seller:</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Buyer receives: $0.00</li>
                      <li>• Seller receives: ${(selectedDispute.price * 0.95).toFixed(2)}</li>
                      <li>• Platform fee: ${(selectedDispute.price * 0.05).toFixed(2)}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    Choose your decision carefully. This action will be logged in the admin audit trail and cannot be
                    undone.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => handleResolveDispute("refund_buyer")}
                  disabled={!resolutionReason || !adminNotes.trim()}
                  className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <User className="mr-2 h-4 w-4" />
                  Refund Buyer
                </Button>
                <Button
                  onClick={() => handleResolveDispute("pay_seller")}
                  disabled={!resolutionReason || !adminNotes.trim()}
                  className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pay Seller
                </Button>
                <Button
                  onClick={() => handleResolveDispute("partial_refund")}
                  disabled={!resolutionReason || !adminNotes.trim()}
                  variant="outline"
                  className="w-full sm:flex-1"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Partial Refund
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showAdminHistory} onOpenChange={setShowAdminHistory}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <History className="mr-2 h-5 w-5" />
              Complete Admin Actions History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {adminActions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Payment Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="text-sm">
                        {new Date(action.createdAt).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-gray-500">{new Date(action.createdAt).toLocaleTimeString()}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center">
                          <Shield className="mr-1 h-3 w-3 text-blue-600" />
                          {action.adminName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800">{action.actionType.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {action.targetType}: {action.targetId?.slice(-8)}
                        {action.details?.serviceName && (
                          <div className="text-xs text-gray-500">{action.details.serviceName}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <div className="space-y-1">
                          {action.details?.decision && (
                            <p>
                              <strong>Decision:</strong> {action.details.decision.replace("_", " ")}
                            </p>
                          )}
                          {action.details?.resolutionReason && (
                            <p>
                              <strong>Reason:</strong> {action.details.resolutionReason}
                            </p>
                          )}
                          {action.details?.adminNotes && (
                            <p className="text-xs text-gray-600 truncate" title={action.details.adminNotes}>
                              <strong>Notes:</strong> {action.details.adminNotes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {action.details?.paymentDetails && (
                          <div className="space-y-1">
                            {action.details.paymentDetails.buyerRefund > 0 && (
                              <p className="text-blue-600">Buyer: ${action.details.paymentDetails.buyerRefund}</p>
                            )}
                            {action.details.paymentDetails.sellerPayment > 0 && (
                              <p className="text-green-600">Seller: ${action.details.paymentDetails.sellerPayment}</p>
                            )}
                            {action.details.paymentDetails.platformFee > 0 && (
                              <p className="text-gray-600">Fee: ${action.details.paymentDetails.platformFee}</p>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">No admin actions recorded yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{viewingFile.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewingFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {viewingFile.type.startsWith("image/") ? (
              <img
                src={viewingFile.url || "/placeholder.svg"}
                alt={viewingFile.name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Cannot preview this file type in browser</p>
                <Button
                  onClick={() => {
                    const link = document.createElement("a")
                    link.href = viewingFile.url
                    link.download = viewingFile.name
                    link.click()
                  }}
                >
                  Download File
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface OrderTableProps {
  orders: MarketplaceOrder[]
  onSelectOrder: (order: MarketplaceOrder) => void
}

const OrderTable: React.FC<OrderTableProps> = ({ orders, onSelectOrder }) => {
  const safeFormatDate = (dateValue: string | Date | undefined | null) => {
    if (!dateValue) return "Unknown"

    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return "Invalid date"

    try {
      return date.toLocaleDateString()
    } catch (error) {
      console.error("[v0] Date formatting error:", error, "for value:", dateValue)
      return "Unknown"
    }
  }

  const formatOrderStatus = (status: string) => {
    switch (status) {
      case "awaiting":
        return "Awaiting Acceptance"
      case "active":
        return "In Progress"
      case "completed":
        return "Completed"
      case "disputed":
        return "Disputed"
      default:
        return "Unknown"
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "awaiting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "active":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "disputed":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{order.serviceName}</div>
                <div className="text-sm text-gray-500">#{order.sequentialId}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{order.buyerId}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{order.sellerId}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={`${getStatusBadgeStyle(order.status)} font-medium`}>
                  {formatOrderStatus(order.status)}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-green-600">${order.price}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{safeFormatDate(order.createdAt)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <Button variant="outline" size="sm" onClick={() => onSelectOrder(order)}>
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
