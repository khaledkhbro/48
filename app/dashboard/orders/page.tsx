"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { marketplaceOrderManager, formatOrderStatus, type MarketplaceOrder } from "@/lib/marketplace-orders"
import { useAuth } from "@/contexts/auth-context"
import {
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  MessageCircle,
  DollarSign,
  Truck,
  Search,
  Filter,
  RefreshCw,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  Link,
  AlertTriangle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileUpload } from "@/components/file-upload"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { OrderTimer } from "@/components/orders/order-timer"
import { ExtensionRequestDialog } from "@/components/orders/extension-request-dialog"
import { ReviewDialog } from "@/components/review-dialog"

interface MarketplaceReview {
  id: string
  order_id: string
  reviewer_id: string
  reviewee_id: string
  reviewer_type: "buyer" | "seller"
  rating: number
  title: string
  comment: string
  communication_rating: number
  quality_rating: number
  value_rating: number
  delivery_time_rating: number
  created_at: string
  updated_at: string
  is_deleted: boolean
}

const MARKETPLACE_REVIEWS_KEY = "marketplace-reviews"

const getStoredReviews = (): MarketplaceReview[] => {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(MARKETPLACE_REVIEWS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const getReviewByOrderAndReviewer = (
  orderId: string,
  reviewerId: string,
  reviewerType: "buyer" | "seller",
): MarketplaceReview | null => {
  const reviews = getStoredReviews()
  return (
    reviews.find(
      (r) =>
        r.order_id === orderId && r.reviewer_id === reviewerId && r.reviewer_type === reviewerType && !r.is_deleted,
    ) || null
  )
}

interface PaginationComponentProps {
  totalItems: number
  status: string
}

const PaginationComponent: React.FC<PaginationComponentProps> = ({ totalItems, status }) => {
  const totalPages = Math.ceil(totalItems / 5)
  const [currentPage, setCurrentPage] = useState(1)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return totalPages > 1 ? (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * 5 + 1} to {Math.min(currentPage * 5, totalItems)} of {totalItems} orders
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => handlePageChange(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  ) : null
}

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null)
  const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false)
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null)
  const [deliveryMessage, setDeliveryMessage] = useState("")
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([])
  const [deliveryLinks, setDeliveryLinks] = useState<string[]>([""])
  const [disputeReason, setDisputeReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [disputeDetails, setDisputeDetails] = useState("")
  const [disputeFiles, setDisputeFiles] = useState<File[]>([])
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [showStartWorkDialog, setShowStartWorkDialog] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState("")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)

  const [showExtensionDialog, setShowExtensionDialog] = useState(false)
  const [extensionOrderId, setExtensionOrderId] = useState<string | null>(null)

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<MarketplaceOrder | null>(null)
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0)

  const viewMode = (searchParams.get("view") as "buyer" | "seller") || "buyer"

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "price" | "status">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const hasUserReviewed = (orderId: string, userRole: "buyer" | "seller") => {
    if (!user?.id) return false
    const review = getReviewByOrderAndReviewer(orderId, user.id, userRole)
    return review !== null
  }

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MARKETPLACE_REVIEWS_KEY) {
        // Force re-render to update review button states
        setReviewRefreshTrigger((prev) => prev + 1)
      }
    }

    // Listen for storage changes from other tabs/components
    window.addEventListener("storage", handleStorageChange)

    // Also listen for custom events from same tab
    const handleCustomStorageChange = () => {
      setReviewRefreshTrigger((prev) => prev + 1)
    }
    window.addEventListener("reviewsUpdated", handleCustomStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("reviewsUpdated", handleCustomStorageChange)
    }
  }, [])

  const handleReviewClick = (order: MarketplaceOrder, userRole: "buyer" | "seller") => {
    setSelectedOrderForReview(order)
    setReviewDialogOpen(true)
  }

  const handleSubmitDelivery = async (order?: any) => {
    const orderToSubmit = order || selectedOrder
    if (!orderToSubmit) return

    // For direct button clicks, open the enhanced delivery modal
    if (order) {
      setSelectedOrder(order)
      setShowDeliveryDialog(true)
      return
    }

    // For modal submission, validate inputs
    if (!deliveryMessage.trim() && deliveryFiles.length === 0 && !deliveryLinks.some((link) => link.trim())) {
      alert("Please provide a delivery message, upload files, or add links.")
      return
    }

    setActionLoading(orderToSubmit.id)
    try {
      const success = marketplaceOrderManager.submitDelivery(orderToSubmit.id, user.id, {
        files: deliveryFiles.map((file) => file.name),
        links: deliveryLinks.filter((link) => link.trim()),
        message: deliveryMessage,
      })

      if (success) {
        loadOrders()
        setShowDeliveryDialog(false)
        setSelectedOrder(null)
        setDeliveryMessage("")
        setDeliveryFiles([])
        setDeliveryLinks([""])
        alert("Delivery submitted successfully! The buyer has 3 days to review and release payment.")
      } else {
        alert("Failed to submit delivery. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error submitting delivery:", error)
      alert("Failed to submit delivery. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const addDeliveryLink = () => {
    setDeliveryLinks([...deliveryLinks, ""])
  }

  const updateDeliveryLink = (index: number, value: string) => {
    const updated = [...deliveryLinks]
    updated[index] = value
    setDeliveryLinks(updated)
  }

  const removeDeliveryLink = (index: number) => {
    if (deliveryLinks.length > 1) {
      setDeliveryLinks(deliveryLinks.filter((_, i) => i !== index))
    }
  }

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (order) =>
          order.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.requirements.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case "price":
          comparison = a.price - b.price
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [orders, searchQuery, sortBy, sortOrder, statusFilter])

  const ITEMS_PER_PAGE = 5
  const currentPageOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return filteredAndSortedOrders.slice(start, end)
  }, [filteredAndSortedOrders, currentPage])

  const totalPagesCount = Math.ceil(filteredAndSortedOrders.length / ITEMS_PER_PAGE)

  const activeOrders = orders.filter((order) => ["pending", "in_progress"].includes(order.status))
  const deliveredOrders = orders.filter((order) => order.status === "delivered")
  const completedOrders = orders.filter((order) => ["completed", "dispute_resolved"].includes(order.status))
  const cancelledOrders = orders.filter((order) => ["cancelled", "disputed"].includes(order.status))

  const [activeTab, setActiveTab] = useState<"buyer" | "seller">(viewMode)

  const buyerDisputeReasons = [
    "Work not completed as described",
    "Poor quality delivery",
    "Seller didn't follow requirements",
    "Delivery was late without communication",
    "Seller is unresponsive",
    "Work contains plagiarism or copyright issues",
    "Other",
  ]

  const sellerDisputeReasons = [
    "Buyer requesting additional work beyond scope",
    "Buyer provided unclear or incomplete requirements",
    "Buyer is unresponsive to messages",
    "Buyer requesting unreasonable revisions",
    "Payment dispute or chargeback threat",
    "Buyer harassment or inappropriate behavior",
    "Other",
  ]

  useEffect(() => {
    if (user) {
      loadOrders()
    }

    const interval = setInterval(() => {
      marketplaceOrderManager.cleanupExpiredOrders()
      if (user) {
        loadOrders()
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [viewMode, user])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, sortOrder, statusFilter, viewMode])

  const loadOrders = () => {
    if (!user) return

    setLoading(true)
    try {
      const userOrders = marketplaceOrderManager.getOrdersByUser(user.id, viewMode)
      console.log(`[v0] Loaded ${viewMode} orders:`, userOrders.length)
      setOrders(userOrders)
    } catch (error) {
      console.error("[v0] Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const getOrdersByStatus = (status: string) => {
    let statusOrders = []

    switch (status) {
      case "awaiting":
        statusOrders = filteredAndSortedOrders.filter((order) => order.status === "awaiting_acceptance")
        break
      case "active":
        statusOrders = filteredAndSortedOrders.filter((order) => ["pending", "in_progress"].includes(order.status))
        break
      case "delivered":
        statusOrders = filteredAndSortedOrders.filter((order) => order.status === "delivered")
        break
      case "completed":
        statusOrders = filteredAndSortedOrders.filter((order) =>
          ["completed", "dispute_resolved"].includes(order.status),
        )
        break
      case "cancelled":
        statusOrders = filteredAndSortedOrders.filter((order) => ["cancelled", "disputed"].includes(order.status))
        break
      default:
        statusOrders = filteredAndSortedOrders
    }

    const startIdx = (currentPage - 1) * itemsPerPage
    return statusOrders.slice(startIdx, startIdx + itemsPerPage)
  }

  const handleReleasePayment = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const success = marketplaceOrderManager.releasePayment(orderId, user.id)
      if (success) {
        loadOrders()
        alert("Payment released successfully! The seller has been paid.")
      } else {
        alert("Failed to release payment. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error releasing payment:", error)
      alert("Failed to release payment. Please try again.")
    } finally {
      setActionLoading(null)
      setShowPaymentConfirmDialog(false)
      setPaymentOrderId(null)
    }
  }

  const handleReleasePaymentClick = (orderId: string) => {
    setPaymentOrderId(orderId)
    setShowPaymentConfirmDialog(true)
  }

  const handleOpenDispute = async () => {
    if (!selectedOrder) return

    const finalReason = disputeReason === "Other" ? customReason : disputeReason

    if (!finalReason.trim() || !disputeDetails.trim()) return

    setActionLoading(selectedOrder.id)
    try {
      console.log("[v0] Opening dispute for order:", selectedOrder.id)
      console.log("[v0] Current activeTab:", activeTab)
      console.log("[v0] User ID:", user.id)
      console.log("[v0] Selected order details:", {
        id: selectedOrder.id,
        buyerId: selectedOrder.buyerId,
        sellerId: selectedOrder.sellerId,
        status: selectedOrder.status,
      })
      console.log("[v0] Dispute details:", {
        reason: finalReason,
        details: disputeDetails,
        userType: activeTab,
        evidenceFiles: disputeFiles.length,
      })

      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          userId: user.id,
          reason: finalReason,
          details: disputeDetails,
          userType: activeTab, // This will be validated and corrected by the API
          evidenceFiles: disputeFiles,
        }),
      })

      const result = await response.json()
      console.log("[v0] Dispute API response:", result)

      if (response.ok && result.success) {
        loadOrders()
        setSelectedOrder(null)
        setDisputeReason("")
        setCustomReason("")
        setDisputeDetails("")
        setDisputeFiles([])
        setShowDisputeDialog(false)
        alert("Dispute opened successfully. An admin will review your case.")
      } else {
        console.error("[v0] Dispute API error:", result.error)
        alert(result.error || "Failed to open dispute. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error opening dispute:", error)
      alert("Failed to open dispute. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleAcceptOrder = async (orderId: string) => {
    setPendingOrderId(orderId)
    setShowAcceptDialog(true)
  }

  const confirmAcceptOrder = async () => {
    if (!pendingOrderId) return

    setActionLoading(pendingOrderId)
    try {
      const success = marketplaceOrderManager.acceptOrder(pendingOrderId, user.id)
      if (success) {
        loadOrders()
        alert("Order accepted successfully! You can now start working on it.")
      } else {
        alert("Failed to accept order. It may have expired or already been processed.")
      }
    } catch (error) {
      console.error("[v0] Error accepting order:", error)
      alert("Failed to accept order. Please try again.")
    } finally {
      setActionLoading(null)
      setShowAcceptDialog(false)
      setPendingOrderId(null)
    }
  }

  const handleDeclineOrder = async (orderId: string) => {
    setPendingOrderId(orderId)
    setShowDeclineDialog(true)
  }

  const confirmDeclineOrder = async () => {
    if (!pendingOrderId || !declineReason.trim()) return

    setActionLoading(pendingOrderId)
    try {
      const success = marketplaceOrderManager.declineOrder(pendingOrderId, user.id, declineReason)
      if (success) {
        loadOrders()
        alert("Order declined. The buyer has been refunded.")
      } else {
        alert("Failed to decline order. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error declining order:", error)
      alert("Failed to decline order. Please try again.")
    } finally {
      setActionLoading(null)
      setShowDeclineDialog(false)
      setPendingOrderId(null)
      setDeclineReason("")
    }
  }

  const handleUpdateStatus = async (orderId: string, newStatus: "pending" | "in_progress" | "delivered") => {
    if (newStatus === "in_progress") {
      setPendingOrderId(orderId)
      setShowStartWorkDialog(true)
      return
    }

    setActionLoading(orderId)
    try {
      const success = marketplaceOrderManager.updateOrderStatus(orderId, user.id, newStatus)
      if (success) {
        loadOrders()
        alert(`Order status updated to ${formatOrderStatus(newStatus)}`)
      } else {
        alert("Failed to update order status. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error updating status:", error)
      alert("Failed to update order status. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const confirmStartWork = async () => {
    if (!pendingOrderId) return

    setActionLoading(pendingOrderId)
    try {
      const success = marketplaceOrderManager.updateOrderStatus(pendingOrderId, user.id, "in_progress")
      if (success) {
        loadOrders()
        alert("Work started! Order status updated to In Progress.")
      } else {
        alert("Failed to start work. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error starting work:", error)
      alert("Failed to start work. Please try again.")
    } finally {
      setActionLoading(null)
      setShowStartWorkDialog(false)
      setPendingOrderId(null)
    }
  }

  const getTimeRemaining = (deadline: string) => {
    const remaining = marketplaceOrderManager.getTimeRemaining(deadline)
    if (remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0) {
      return "Expired"
    }
    if (remaining.days > 0) {
      return `${remaining.days}d ${remaining.hours}h remaining`
    }
    if (remaining.hours > 0) {
      return `${remaining.hours}h ${remaining.minutes}m remaining`
    }
    return `${remaining.minutes}m remaining`
  }

  const getStatusIcon = (status: MarketplaceOrder["status"]) => {
    switch (status) {
      case "awaiting_acceptance":
        return <Clock className="h-4 w-4" />
      case "pending":
        return <AlertCircle className="h-4 w-4" />
      case "in_progress":
        return <Package className="h-4 w-4" />
      case "delivered":
        return <Truck className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
      case "disputed":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const handleViewOrder = (orderId: string) => {
    // The # character is treated as a fragment identifier in URLs, so we need to encode it
    const formattedOrderId = orderId.startsWith("#") ? orderId : `#${orderId}`
    const encodedOrderId = encodeURIComponent(formattedOrderId)
    const viewParam = viewMode === "seller" ? "?view=seller" : "?view=buyer"
    console.log(`[v0] Routing to order: ${formattedOrderId} (encoded: ${encodedOrderId})`)
    router.push(`/dashboard/orders/${encodedOrderId}${viewParam}`)
  }

  const handleCancelOrder = async (orderId: string) => {
    setCancelOrderId(orderId)
    setShowCancelDialog(true)
  }

  const confirmCancelOrder = async () => {
    if (!cancelOrderId || !cancelReason.trim()) return

    setActionLoading(cancelOrderId)
    try {
      const success = marketplaceOrderManager.cancelOrder(cancelOrderId, user.id, cancelReason)
      if (success) {
        loadOrders()
        alert("Order cancelled successfully. The buyer has been refunded.")
      } else {
        alert("Failed to cancel order. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error cancelling order:", error)
      alert("Failed to cancel order. Please try again.")
    } finally {
      setActionLoading(null)
      setShowCancelDialog(false)
      setCancelOrderId(null)
      setCancelReason("")
    }
  }

  const handleRequestExtension = async (orderId: string) => {
    setExtensionOrderId(orderId)
    setShowExtensionDialog(true)
  }

  const submitExtensionRequest = async (days: number, reason: string) => {
    if (!extensionOrderId) return

    setActionLoading(extensionOrderId)
    try {
      const success = marketplaceOrderManager.requestExtension(extensionOrderId, user.id, days, reason)
      if (success) {
        loadOrders()
        setShowExtensionDialog(false)
        setExtensionOrderId(null)
        alert(
          `Extension request sent! The buyer will be notified and can approve ${days} additional day${days !== 1 ? "s" : ""}.`,
        )
      } else {
        alert("Failed to send extension request. You may have already requested an extension for this order.")
      }
    } catch (error) {
      console.error("[v0] Error requesting extension:", error)
      alert("Failed to send extension request. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const OrderCard = ({ order, viewMode }: { order: MarketplaceOrder; viewMode: "buyer" | "seller" }) => {
    const router = useRouter()
    const messageCount = order.messages?.length || 0
    const hasUnreadMessages = messageCount > 0

    return (
      <Card key={order.id} className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs md:text-sm">
                  {(viewMode === "buyer" ? order.sellerId : order.buyerId).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-gray-900 text-lg md:text-xl truncate mb-1">{order.serviceTitle}</h2>
                <p className="text-sm md:text-base text-gray-700 truncate">
                  {viewMode === "buyer"
                    ? `Seller: ${order.sellerName || "Unknown"} (${order.sellerId})`
                    : `Buyer: ${order.buyerName || "Unknown"} (${order.buyerId})`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Order {order.id} • Created {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end space-x-3 sm:space-x-0 sm:space-y-2">
              <div className="text-left sm:text-right">
                <p className="text-lg md:text-xl font-bold text-gray-900">${order.price}</p>
                <p className="text-xs text-gray-500">{order.tier}</p>
              </div>
              <Badge
                variant="secondary"
                className={`
                  ${order.status === "awaiting_acceptance" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : ""}
                  ${order.status === "pending" || order.status === "in_progress" ? "bg-blue-100 text-blue-800 border-blue-200" : ""}
                  ${order.status === "delivered" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}
                  ${order.status === "completed" ? "bg-green-100 text-green-800 border-green-200" : ""}
                  ${order.status === "cancelled" || order.status === "disputed" ? "bg-red-100 text-red-800 border-red-200" : ""}
                  font-medium px-2 py-1 text-xs whitespace-nowrap
                `}
              >
                {order.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
          </div>

          {order.status === "in_progress" && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Delivery Countdown</span>
                <OrderTimer expiresAt={order.expiresAt} status={order.status} />
              </div>
              <p className="text-xs text-blue-700 mb-2">
                {viewMode === "seller"
                  ? "Complete and deliver before the timer expires to avoid automatic cancellation"
                  : "Your order will be automatically refunded if not delivered on time"}
              </p>
              {viewMode === "seller" && !order.extensionRequested && (
                <Button
                  onClick={() => handleRequestExtension(order.id)}
                  disabled={actionLoading === order.id}
                  variant="outline"
                  size="sm"
                  className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 text-xs"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  Request Extension
                </Button>
              )}
              {order.extensionRequested && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                  <p className="text-xs text-yellow-800 font-medium">Extension request pending buyer approval</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 p-3 md:p-4 rounded-lg mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service</p>
                <p className="text-sm text-gray-900 font-medium truncate">{order.serviceTitle}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery Time</p>
                <p className="text-sm text-gray-900">{order.deliveryTime || "3 days"}</p>
              </div>
            </div>

            {order.requirements && order.requirements !== "No specific requirements provided" && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Requirements</p>
                <p className="text-sm text-gray-700 bg-white p-2 md:p-3 rounded border line-clamp-3">
                  {order.requirements}
                </p>
              </div>
            )}

            {order.deliverables && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Delivered Work</p>
                <div className="bg-white p-2 md:p-3 rounded border">
                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">{order.deliverables.message}</p>
                  {order.deliverables.files.length > 0 && (
                    <div className="flex items-center text-xs text-blue-600">
                      <Package className="h-3 w-3 mr-1" />
                      {order.deliverables.files.length} file(s) attached
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <Button
              onClick={() => handleViewOrder(order.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-lg transition-colors text-sm w-full sm:w-auto"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              {order.status === "awaiting_acceptance" && viewMode === "seller" && (
                <>
                  <Button
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={actionLoading === order.id}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {actionLoading === order.id ? "Processing..." : "Accept Order"}
                  </Button>

                  <Button
                    onClick={() => handleDeclineOrder(order.id)}
                    disabled={actionLoading === order.id}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {actionLoading === order.id ? "Processing..." : "Decline"}
                  </Button>
                </>
              )}

              {order.status === "pending" && viewMode === "seller" && (
                <>
                  <Button
                    onClick={() => handleUpdateStatus(order.id, "in_progress")}
                    disabled={actionLoading === order.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {actionLoading === order.id ? "Processing..." : "Start Work"}
                  </Button>

                  <Button
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={actionLoading === order.id}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {actionLoading === order.id ? "Processing..." : "Cancel Order"}
                  </Button>
                </>
              )}

              {order.status === "in_progress" && viewMode === "seller" && (
                <>
                  <Button
                    onClick={() => handleSubmitDelivery(order)}
                    disabled={actionLoading === order.id}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {actionLoading === order.id ? "Processing..." : "Submit Delivery"}
                  </Button>

                  <Button
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={actionLoading === order.id}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {actionLoading === order.id ? "Processing..." : "Cancel Order"}
                  </Button>
                </>
              )}

              {order.status === "delivered" && viewMode === "seller" && (
                <>
                  <Button
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={actionLoading === order.id}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {actionLoading === order.id ? "Processing..." : "Cancel Order"}
                  </Button>

                  <Button
                    onClick={() => {
                      setSelectedOrder(order)
                      setShowDisputeDialog(true)
                    }}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Open Dispute
                  </Button>
                </>
              )}

              {order.status === "delivered" && viewMode === "buyer" && (
                <>
                  <Button
                    onClick={() => handleReleasePaymentClick(order.id)}
                    disabled={actionLoading === order.id}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    {actionLoading === order.id ? "Processing..." : "Release Payment"}
                  </Button>

                  <Button
                    onClick={() => {
                      setSelectedOrder(order)
                      setShowDisputeDialog(true)
                    }}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Open Dispute
                  </Button>
                </>
              )}

              {/* Show review button for delivered orders (buyer view) */}
              {order.status === "delivered" && viewMode === "buyer" && (
                <Button
                  onClick={() => handleReviewClick(order, "buyer")}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                >
                  <Star className="mr-2 h-4 w-4" />
                  {hasUserReviewed(order.id, "buyer") ? "Edit Review" : "Leave Review"}
                </Button>
              )}

              {/* Show review button for completed orders (both buyer and seller) */}
              {order.status === "completed" && viewMode === "buyer" && (
                <Button
                  onClick={() => handleReviewClick(order, "buyer")}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                >
                  <Star className="mr-2 h-4 w-4" />
                  {hasUserReviewed(order.id, "buyer") ? "Edit Review" : "Leave Review"}
                </Button>
              )}

              {order.status === "completed" && viewMode === "seller" && (
                <Button
                  onClick={() => handleReviewClick(order, "seller")}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-3 py-2 rounded-lg text-sm"
                >
                  <Star className="mr-2 h-4 w-4" />
                  {hasUserReviewed(order.id, "seller") ? "Edit Review" : "Leave Review"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/messages?orderId=${order.id}`)}
                className="border-gray-300 hover:bg-gray-50 text-sm px-3 py-2 relative"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Message {viewMode === "buyer" ? "Seller" : "Buyer"}</span>
                <span className="sm:hidden">Message</span>
                {messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {messageCount > 9 ? "9+" : messageCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusCounts = useMemo(() => {
    return [
      {
        status: "all",
        label: "All Orders",
        count: orders.length,
        icon: Package,
        iconColor: "text-gray-600",
        bgColor: "bg-gray-100",
      },
      {
        status: "awaiting_acceptance",
        label: "Awaiting",
        count: orders.filter((order) => order.status === "awaiting_acceptance").length,
        icon: Clock,
        iconColor: "text-yellow-600",
        bgColor: "bg-yellow-100",
      },
      {
        status: "pending",
        label: "Pending",
        count: activeOrders.length,
        icon: AlertCircle,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        status: "in_progress",
        label: "In Progress",
        count: activeOrders.length,
        icon: Package,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        status: "delivered",
        label: "Delivered",
        count: deliveredOrders.length,
        icon: Truck,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-100",
      },
      {
        status: "completed",
        label: "Completed",
        count: completedOrders.length,
        icon: CheckCircle,
        iconColor: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        status: "cancelled",
        label: "Cancelled",
        count: cancelledOrders.length,
        icon: XCircle,
        iconColor: "text-red-600",
        bgColor: "bg-red-100",
      },
      {
        status: "disputed",
        label: "Disputed",
        count: cancelledOrders.length,
        icon: XCircle,
        iconColor: "text-red-600",
        bgColor: "bg-red-100",
      },
    ]
  }, [orders, activeOrders, deliveredOrders, completedOrders, cancelledOrders])

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage)
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredAndSortedOrders.slice(start, end)
  }, [filteredAndSortedOrders, currentPage, itemsPerPage])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {viewMode === "buyer" ? "Your Orders" : "Orders for Your Services"}
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                {viewMode === "buyer"
                  ? "Track your purchases and manage payments"
                  : "Manage your marketplace orders and deliveries"}
              </p>
            </div>
            <Button
              onClick={loadOrders}
              variant="outline"
              className="self-start sm:self-auto bg-transparent"
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2 mb-6">
            <Button
              variant={viewMode === "buyer" ? "default" : "outline"}
              onClick={() => router.push("/dashboard/orders?view=buyer")}
              className="text-sm"
            >
              Buyer Orders
            </Button>
            <Button
              variant={viewMode === "seller" ? "default" : "outline"}
              onClick={() => router.push("/dashboard/orders?view=seller")}
              className="text-sm"
            >
              Seller Orders
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
            {statusCounts.map((stat) => (
              <Card key={stat.status} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1 line-clamp-2">{stat.label}</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">{stat.count}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="awaiting_acceptance">Awaiting</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split("-")
                setSortBy(field as "date" | "price" | "status")
                setSortOrder(order as "asc" | "desc")
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date Created ↓</SelectItem>
                <SelectItem value="date-asc">Date Created ↑</SelectItem>
                <SelectItem value="price-desc">Price ↓</SelectItem>
                <SelectItem value="price-asc">Price ↑</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
                <SelectItem value="status-desc">Status Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {statusCounts.map((stat) => (
              <Button
                key={stat.status}
                variant={statusFilter === stat.status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(stat.status)}
                className="text-xs md:text-sm"
              >
                {stat.label} ({stat.count})
              </Button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : paginatedOrders.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-8 md:p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : viewMode === "buyer"
                    ? "You haven't placed any orders yet"
                    : "You haven't received any orders yet"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => router.push("/marketplace")} className="bg-blue-600 hover:bg-blue-700">
                  Browse Services
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {paginatedOrders.map((order) => (
              <OrderCard key={order.id} order={order} viewMode={viewMode} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)} of {filteredAndSortedOrders.length}{" "}
              orders
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Delivery Dialog */}
        <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Submit Delivery
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Delivery Message</label>
                <Textarea
                  placeholder="Describe what you've delivered, any special instructions, or notes for the buyer..."
                  value={deliveryMessage}
                  onChange={(e) => setDeliveryMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Upload Files</label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload your completed work, source files, or any deliverables
                </p>
                <FileUpload
                  onFilesChange={setDeliveryFiles}
                  maxFiles={10}
                  maxSize={50}
                  acceptedTypes={[
                    "image/*",
                    "application/pdf",
                    ".doc",
                    ".docx",
                    ".zip",
                    ".rar",
                    ".psd",
                    ".ai",
                    ".sketch",
                  ]}
                  showPreview={true}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Share Links</label>
                <p className="text-xs text-gray-500 mb-3">
                  Add links to live previews, cloud storage, or external deliverables
                </p>
                <div className="space-y-3">
                  {deliveryLinks.map((link, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="https://example.com/your-work"
                          value={link}
                          onChange={(e) => updateDeliveryLink(index, e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {deliveryLinks.length > 1 && (
                        <Button variant="outline" size="sm" onClick={() => removeDeliveryLink(index)} className="px-3">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addDeliveryLink} className="w-full bg-transparent">
                    <Link className="mr-2 h-4 w-4" />
                    Add Another Link
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSubmitDelivery()}
                  disabled={actionLoading === selectedOrder?.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading === selectedOrder?.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Delivery
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept Order Confirmation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to accept this order? By accepting, you commit to:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Delivering the work within the specified timeframe</li>
                  <li>Meeting all the buyer's requirements</li>
                  <li>Maintaining professional communication</li>
                  <li>Following the platform's terms of service</li>
                </ul>
                Once accepted, you cannot cancel without penalty.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowAcceptDialog(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAcceptOrder} className="bg-green-600 hover:bg-green-700">
                Yes, Accept Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline Order</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to decline this order. The buyer will receive a full refund. Please provide a reason for
                declining:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Textarea
                placeholder="Please explain why you cannot complete this order..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowDeclineDialog(false)
                  setDeclineReason("")
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeclineOrder}
                disabled={!declineReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                Decline Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showStartWorkDialog} onOpenChange={setShowStartWorkDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Work Confirmation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you ready to start working on this order? This will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Change the order status to "In Progress"</li>
                  <li>Start the delivery countdown timer</li>
                  <li>Notify the buyer that work has begun</li>
                  <li>Make you responsible for timely delivery</li>
                </ul>
                Make sure you understand all requirements before proceeding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowStartWorkDialog(false)}>Not Yet</AlertDialogCancel>
              <AlertDialogAction onClick={confirmStartWork} className="bg-blue-600 hover:bg-blue-700">
                Yes, Start Work
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-red-600">
                <XCircle className="mr-2 h-5 w-5" />
                Cancel Order
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>Warning:</strong> Cancelling this order will:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                    <li>Immediately refund the full amount to the buyer</li>
                    <li>End your work on this project</li>
                    <li>Potentially affect your seller rating</li>
                    <li>Cannot be undone once confirmed</li>
                  </ul>
                  <p className="text-sm text-gray-700 mt-3">Please provide a detailed reason for cancellation:</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Textarea
                placeholder="Explain why you need to cancel this order (e.g., unable to meet requirements, technical issues, personal emergency)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                This reason will be shared with the buyer and may be reviewed by our support team.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowCancelDialog(false)
                  setCancelReason("")
                  setCancelOrderId(null)
                }}
              >
                Keep Order
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelOrder}
                disabled={!cancelReason.trim() || cancelReason.trim().length < 10}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading === cancelOrderId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Order & Refund
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Extension Request Dialog */}
        <ExtensionRequestDialog
          open={showExtensionDialog}
          onOpenChange={setShowExtensionDialog}
          onSubmit={submitExtensionRequest}
          loading={actionLoading === extensionOrderId}
          orderTitle={orders.find((o) => o.id === extensionOrderId)?.serviceTitle || ""}
        />
      </div>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentConfirmDialog} onOpenChange={setShowPaymentConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-orange-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Confirm Payment Release
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800 font-medium mb-2">⚠️ Important: This action cannot be undone</p>
              <p className="text-sm text-orange-700">
                Once you release the payment, the funds will be immediately transferred to the seller. Make sure you are
                completely satisfied with the delivered work before proceeding.
              </p>
            </div>

            {paymentOrderId && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Order Details:</p>
                <div className="text-sm text-gray-600 space-y-1">
                  {(() => {
                    const order = orders.find((o) => o.id === paymentOrderId)
                    return order ? (
                      <>
                        <p>• Service: {order.serviceName}</p>
                        <p>• Amount: ${order.price}</p>
                        <p>• Order ID: #{order.id}</p>
                      </>
                    ) : null
                  })()}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentConfirmDialog(false)
                  setPaymentOrderId(null)
                }}
                disabled={actionLoading === paymentOrderId}
              >
                Cancel
              </Button>
              <Button
                onClick={() => paymentOrderId && handleReleasePayment(paymentOrderId)}
                disabled={actionLoading === paymentOrderId}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading === paymentOrderId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Releasing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Yes, Release Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Open Dispute
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Reason</label>
              <Select value={disputeReason} onValueChange={setDisputeReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dispute reason..." />
                </SelectTrigger>
                <SelectContent>
                  {(viewMode === "buyer" ? buyerDisputeReasons : sellerDisputeReasons).map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {disputeReason === "Other" && (
                <Textarea
                  placeholder="Please specify your reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={2}
                  className="mt-2 resize-none"
                />
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Details</label>
              <Textarea
                placeholder="Detailed explanation of the issue..."
                value={disputeDetails}
                onChange={(e) => setDisputeDetails(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Evidence (Optional)</label>
              <p className="text-xs text-gray-500 mb-3">
                Upload screenshots, documents, or other files that support your dispute claim
              </p>
              <FileUpload
                onFilesChange={setDisputeFiles}
                maxFiles={5}
                maxSize={10}
                acceptedTypes={["image/*", "application/pdf", ".doc", ".docx", ".txt"]}
                showPreview={true}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisputeDialog(false)
                  setSelectedOrder(null)
                  setDisputeReason("")
                  setCustomReason("")
                  setDisputeDetails("")
                  setDisputeFiles([])
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleOpenDispute}
                disabled={
                  !disputeReason.trim() ||
                  (disputeReason === "Other" && !customReason.trim()) ||
                  !disputeDetails.trim() ||
                  actionLoading === selectedOrder?.id
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                {actionLoading === selectedOrder?.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Opening...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Open Dispute
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {reviewDialogOpen && selectedOrderForReview && (
        <ReviewDialog
          order={selectedOrderForReview}
          userRole={viewMode}
          onClose={() => {
            setReviewDialogOpen(false)
            setSelectedOrderForReview(null)
          }}
          onSubmit={() => {
            setReviewDialogOpen(false)
            setSelectedOrderForReview(null)
            setReviewRefreshTrigger((prev) => prev + 1)
            window.dispatchEvent(new CustomEvent("reviewsUpdated"))
            // Refresh orders to update review button state
            loadOrders()
          }}
        />
      )}
    </div>
  )
}
