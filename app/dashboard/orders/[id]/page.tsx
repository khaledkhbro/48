"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link,
  Package,
  DollarSign,
  AlertCircle,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { FileUpload } from "@/components/file-upload"
import {
  marketplaceOrderManager,
  type MarketplaceOrder,
  formatOrderStatus,
  getOrderStatusColor,
} from "@/lib/marketplace-orders"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

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

const saveReviews = (reviews: MarketplaceReview[]): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(MARKETPLACE_REVIEWS_KEY, JSON.stringify(reviews))
  } catch (error) {
    console.error("Failed to save reviews:", error)
  }
}

const submitMarketplaceReview = async (reviewData: {
  orderId: string
  reviewerId: string
  revieweeId: string
  reviewerType: "buyer" | "seller"
  rating: number
  title: string
  comment: string
  communicationRating: number
  qualityRating: number
  valueRating: number
  deliveryTimeRating: number
}): Promise<MarketplaceReview> => {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const newReview: MarketplaceReview = {
    id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    order_id: reviewData.orderId,
    reviewer_id: reviewData.reviewerId,
    reviewee_id: reviewData.revieweeId,
    reviewer_type: reviewData.reviewerType,
    rating: reviewData.rating,
    title: reviewData.title,
    comment: reviewData.comment,
    communication_rating: reviewData.communicationRating,
    quality_rating: reviewData.qualityRating,
    value_rating: reviewData.valueRating,
    delivery_time_rating: reviewData.deliveryTimeRating,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
  }

  const reviews = getStoredReviews()
  const existingIndex = reviews.findIndex(
    (r) => r.order_id === reviewData.orderId && r.reviewer_id === reviewData.reviewerId,
  )

  if (existingIndex >= 0) {
    reviews[existingIndex] = {
      ...newReview,
      id: reviews[existingIndex].id,
      created_at: reviews[existingIndex].created_at,
    }
  } else {
    reviews.push(newReview)
  }

  saveReviews(reviews)
  return newReview
}

const getReviewByOrderAndUser = (orderId: string, userId: string): MarketplaceReview | null => {
  const reviews = getStoredReviews()
  return reviews.find((r) => r.order_id === orderId && r.reviewer_id === userId && !r.is_deleted) || null
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

const SimpleStarRating = ({
  rating,
  onRatingChange,
  size = "h-6 w-6",
}: {
  rating: number
  onRatingChange: (rating: number) => void
  size?: string
}) => {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = hovered > 0 ? star <= hovered : star <= rating

        return (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`${size} transition-colors ${isActive ? "text-yellow-400 fill-current" : "text-gray-300"}`}
            />
          </button>
        )
      })}
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()

  const currentViewMode = searchParams.get("view") || "buyer"

  const [order, setOrder] = useState<MarketplaceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")
  const [disputeDetails, setDisputeDetails] = useState("")
  const [disputeFiles, setDisputeFiles] = useState<File[]>([])
  const [reviewRating, setReviewRating] = useState(5)
  const [communicationRating, setCommunicationRating] = useState(5)
  const [qualityRating, setQualityRating] = useState(5)
  const [valueRating, setValueRating] = useState(5)
  const [deliveryTimeRating, setDeliveryTimeRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewComment, setReviewComment] = useState("")
  const [existingBuyerReview, setExistingBuyerReview] = useState<any>(null)
  const [existingSellerReview, setExistingSellerReview] = useState<any>(null)

  const isBuyer = order?.buyerId === user?.id
  const isSeller = order?.sellerId === user?.id
  const isPrimaryBuyer = isBuyer && !isSeller
  const isPrimarySeller = isSeller && !isBuyer
  const isBothRoles = isBuyer && isSeller
  const showBuyerView = isPrimaryBuyer || (isBothRoles && currentViewMode === "buyer")
  const showSellerView = isPrimarySeller || (isBothRoles && currentViewMode === "seller")

  const orderId = params.id as string

  const [newMessage, setNewMessage] = useState("")
  const [deliveryMessage, setDeliveryMessage] = useState("")
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([])
  const [deliveryLinks, setDeliveryLinks] = useState<string[]>([""])
  const [customReason, setCustomReason] = useState("")
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [showStartWorkDialog, setShowStartWorkDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [hoveredRating, setHoveredRating] = useState(0)
  const [hoveredCategoryRating, setHoveredCategoryRating] = useState({ category: "", rating: 0 })

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
    "Buyer requesting additional work beyond scope",
    "Buyer provided unclear or incomplete requirements",
    "Buyer is unresponsive to messages",
    "Buyer requesting unreasonable revisions",
    "Payment dispute or chargeback threat",
    "Buyer harassment or inappropriate behavior",
    "Other",
  ]

  useEffect(() => {
    loadOrder()
  }, [orderId])

  useEffect(() => {
    if (order && user) {
      const buyerReview = getReviewByOrderAndReviewer(order.id, order.buyerId, "buyer")
      const sellerReview = getReviewByOrderAndReviewer(order.id, order.sellerId, "seller")

      setExistingBuyerReview(buyerReview)
      setExistingSellerReview(sellerReview)
    }
  }, [order, user])

  const getCurrentUserReview = () => {
    if (!order || !user) return null

    if (showBuyerView) {
      // Buyer reviewing seller
      return existingBuyerReview
    } else if (showSellerView) {
      // Seller reviewing buyer
      return existingSellerReview
    }
    return null
  }

  const currentUserReview = getCurrentUserReview()

  const loadOrder = () => {
    setLoading(true)
    try {
      const decodedOrderId = decodeURIComponent(orderId)
      console.log(`[v0] Looking for order: ${decodedOrderId} (from URL param: ${orderId})`)
      const foundOrder = marketplaceOrderManager.getOrder(decodedOrderId)
      if (!foundOrder) {
        console.log(`[v0] Order not found: ${decodedOrderId}`)
        setOrder(null)
      } else {
        console.log(`[v0] Loaded order: ${foundOrder.id}`)
        setOrder(foundOrder)
      }
    } catch (error) {
      console.error("[v0] Error loading order:", error)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptOrder = () => {
    setShowAcceptDialog(true)
  }

  const confirmAcceptOrder = async () => {
    if (!order || !user) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.acceptOrder(order.id, user.id)
      if (success) {
        loadOrder()
        setShowAcceptDialog(false)
      } else {
        alert("Failed to accept order. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error accepting order:", error)
      alert("An error occurred while accepting the order.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineOrder = () => {
    setShowDeclineDialog(true)
  }

  const confirmDeclineOrder = async () => {
    if (!order || !user || !declineReason.trim()) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.declineOrder(order.id, user.id)
      if (success) {
        loadOrder()
        setShowDeclineDialog(false)
        setDeclineReason("")
      } else {
        alert("Failed to decline order. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error declining order:", error)
      alert("An error occurred while declining the order.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartWork = () => {
    setShowStartWorkDialog(true)
  }

  const confirmStartWork = async () => {
    if (!order || !user) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.updateOrderStatus(order.id, user.id, "in_progress")
      if (success) {
        loadOrder()
        setShowStartWorkDialog(false)
        alert("Work started! Order status updated to In Progress.")
      } else {
        alert("Failed to start work. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error starting work:", error)
      alert("Failed to start work. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelOrder = () => {
    setShowCancelDialog(true)
  }

  const confirmCancelOrder = async () => {
    if (!order || !user || !cancelReason.trim()) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.cancelOrder(order.id, user.id, cancelReason)
      if (success) {
        loadOrder()
        setShowCancelDialog(false)
        setCancelReason("")
      } else {
        alert("Failed to cancel order. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error cancelling order:", error)
      alert("An error occurred while cancelling the order.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitDelivery = async () => {
    if (!order || !user) return

    if (!deliveryMessage.trim() && deliveryFiles.length === 0 && !deliveryLinks.some((link) => link.trim())) {
      alert("Please provide a delivery message, upload files, or add links.")
      return
    }

    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.submitDelivery(order.id, user.id, {
        files: deliveryFiles.map((file) => file.name),
        links: deliveryLinks.filter((link) => link.trim()),
        message: deliveryMessage,
      })
      if (success) {
        setShowDeliveryDialog(false)
        setDeliveryMessage("")
        setDeliveryFiles([])
        setDeliveryLinks([""])
        loadOrder()
      } else {
        alert("Failed to submit delivery. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error submitting delivery:", error)
      alert("An error occurred while submitting delivery.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReleasePayment = async () => {
    if (!order || !user) return
    setActionLoading(true)
    try {
      const success = marketplaceOrderManager.releasePayment(order.id, user.id)
      if (success) {
        loadOrder()
        alert("Payment released successfully! The seller has been paid.")
      } else {
        alert("Failed to release payment. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error releasing payment:", error)
      alert("An error occurred while releasing payment.")
    } finally {
      setActionLoading(false)
      setShowPaymentConfirmDialog(false)
    }
  }

  const handleOpenDispute = async () => {
    if (!order || !user) return

    const finalReason = disputeReason === "Other" ? customReason : disputeReason

    if (!finalReason.trim() || !disputeDetails.trim()) return

    setActionLoading(true)
    try {
      console.log("[v0] Opening dispute for order:", order.id)
      console.log("[v0] Current viewMode:", currentViewMode)
      console.log("[v0] User ID:", user.id)
      console.log("[v0] Dispute details:", {
        reason: finalReason,
        details: disputeDetails,
        userType: currentViewMode,
        evidenceFiles: disputeFiles.length,
      })

      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          userId: user.id,
          reason: finalReason,
          details: disputeDetails,
          userType: currentViewMode,
          evidenceFiles: disputeFiles,
        }),
      })

      const result = await response.json()
      console.log("[v0] Dispute API response:", result)

      if (response.ok && result.success) {
        setShowDisputeDialog(false)
        setDisputeReason("")
        setCustomReason("")
        setDisputeDetails("")
        setDisputeFiles([])
        loadOrder()
        alert("Dispute opened successfully. An admin will review your case.")
      } else {
        console.error("[v0] Dispute API error:", result.error)
        alert(result.error || "Failed to open dispute. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error opening dispute:", error)
      alert("Failed to open dispute. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!order || !user || !newMessage.trim()) return

    const senderType = order.buyerId === user.id ? "buyer" : "seller"
    const success = marketplaceOrderManager.addMessage(order.id, user.id, senderType, newMessage)

    if (success) {
      setNewMessage("")
      loadOrder()
    } else {
      alert("Failed to send message. Please try again.")
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

  const handleReleasePaymentClick = () => {
    setShowPaymentConfirmDialog(true)
  }

  const handleSubmitReview = async () => {
    if (!order || !user) return

    if (
      reviewRating === 0 ||
      communicationRating === 0 ||
      qualityRating === 0 ||
      valueRating === 0 ||
      deliveryTimeRating === 0
    ) {
      alert("Please provide ratings for all categories")
      return
    }

    if (!reviewTitle.trim()) {
      alert("Please provide a review title")
      return
    }

    setActionLoading(true)
    try {
      const reviewerType = showBuyerView ? "buyer" : "seller"
      const revieweeId = reviewerType === "buyer" ? order.sellerId : order.buyerId

      await submitMarketplaceReview({
        orderId: order.id,
        reviewerId: user.id,
        revieweeId,
        reviewerType,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
        communicationRating,
        qualityRating,
        valueRating,
        deliveryTimeRating,
      })

      window.dispatchEvent(new CustomEvent("reviewsUpdated"))

      const updatedReview = getReviewByOrderAndReviewer(order.id, user.id, reviewerType)
      if (showBuyerView) {
        setExistingBuyerReview(updatedReview)
      } else {
        setExistingSellerReview(updatedReview)
      }

      setShowReviewDialog(false)
      alert(currentUserReview ? "Review updated successfully!" : "Review submitted successfully!")
    } catch (error) {
      console.error("[v0] Error submitting review:", error)
      alert("Failed to submit review. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenReviewDialog = () => {
    if (currentUserReview) {
      setReviewRating(currentUserReview.rating)
      setReviewTitle(currentUserReview.title)
      setReviewComment(currentUserReview.comment)
      setCommunicationRating(currentUserReview.communication_rating)
      setQualityRating(currentUserReview.quality_rating)
      setValueRating(currentUserReview.value_rating)
      setDeliveryTimeRating(currentUserReview.delivery_time_rating)
    } else {
      setReviewRating(0)
      setReviewTitle("")
      setReviewComment("")
      setCommunicationRating(0)
      setQualityRating(0)
      setValueRating(0)
      setDeliveryTimeRating(0)
    }
    setShowReviewDialog(true)
  }

  const StarRating = ({
    rating,
    onRatingChange,
    hoveredRating,
    onHover,
    onLeave,
    size = "h-6 w-6",
  }: {
    rating: number
    onRatingChange: (rating: number) => void
    hoveredRating: number
    onHover: (rating: number) => void
    onLeave: () => void // Fixed type - onLeave should not take parameters
    size?: string
  }) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = hoveredRating > 0 ? star <= hoveredRating : star <= rating

        return (
          <button
            key={star}
            type="button"
            onClick={() => {
              onRatingChange(star)
            }}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={() => onLeave()} // Fixed to call onLeave without parameters
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`${size} transition-colors ${isActive ? "text-yellow-400 fill-current" : "text-gray-300"}`}
            />
          </button>
        )
      })}
    </div>
  )

  if (!user) {
    return <div>Please log in to view this order.</div>
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!order) {
    return <div className="flex items-center justify-center min-h-screen">Order not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/dashboard/orders")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
              <p className="text-gray-600">{order.serviceName}</p>
              {isBothRoles && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">Viewing as:</span>
                  <Button
                    variant={showBuyerView ? "default" : "outline"}
                    size="sm"
                    onClick={() => router.push(`/dashboard/orders/${encodeURIComponent(order.id)}?view=buyer`)}
                  >
                    Buyer
                  </Button>
                  <Button
                    variant={showSellerView ? "default" : "outline"}
                    size="sm"
                    onClick={() => router.push(`/dashboard/orders/${encodeURIComponent(order.id)}?view=seller`)}
                  >
                    Seller
                  </Button>
                </div>
              )}
            </div>
            <Badge className={getOrderStatusColor(order.status)}>{formatOrderStatus(order.status)}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-medium">{order.serviceName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tier</p>
                    <p className="font-medium capitalize">{order.tier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="font-medium">${order.price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Time</p>
                    <p className="font-medium">{order.deliveryTime} days</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Requirements</p>
                  <p className="mt-1">{order.requirements || "No specific requirements provided"}</p>
                </div>

                {order.deliverables && (
                  <div>
                    <p className="text-sm text-gray-600">Deliverables</p>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p>{order.deliverables.message}</p>
                      {order.deliverables.files.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">Files:</p>
                          <ul className="list-disc list-inside">
                            {order.deliverables.files.map((file, index) => (
                              <li key={index} className="text-sm">
                                {file}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {order.status === "disputed" && order.disputeEvidenceFiles && order.disputeEvidenceFiles.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Dispute Evidence</p>
                    <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-800 mb-2">Evidence files submitted with dispute:</p>
                      <ul className="list-disc list-inside">
                        {order.disputeEvidenceFiles.map((file, index) => (
                          <li key={index} className="text-sm text-orange-700">
                            {typeof file === "string" ? file : file.name || `Evidence file ${index + 1}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {order.messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No messages yet</p>
                  ) : (
                    order.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.senderId === user.id ? "bg-blue-50 ml-8" : "bg-gray-50 mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {message.senderId === user.id ? "You" : message.senderType}
                          </span>
                          <span className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                        {message.files && message.files.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">Files:</p>
                            <ul className="list-disc list-inside">
                              {message.files.map((file, index) => (
                                <li key={index} className="text-sm">
                                  {file}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Send Message */}
                <div className="mt-4 space-y-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Order Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {showSellerView && order.status === "awaiting_acceptance" && (
                  <>
                    <Button
                      onClick={handleAcceptOrder}
                      disabled={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accept Order
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDeclineOrder}
                      disabled={actionLoading}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                  </>
                )}

                {showSellerView && order.status === "pending" && (
                  <>
                    <Button
                      onClick={handleStartWork}
                      disabled={actionLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Start Work
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelOrder}
                      disabled={actionLoading}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Order
                    </Button>
                  </>
                )}

                {showSellerView && order.status === "in_progress" && (
                  <>
                    <Button onClick={() => setShowDeliveryDialog(true)} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Delivery
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelOrder}
                      disabled={actionLoading}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Order
                    </Button>
                  </>
                )}

                {showSellerView && order.status === "delivered" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelOrder}
                      disabled={actionLoading}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Order
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDisputeDialog(true)}
                      className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Open Dispute
                    </Button>
                  </>
                )}

                {showBuyerView && order.status === "delivered" && (
                  <>
                    <Button
                      onClick={handleReleasePaymentClick}
                      disabled={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Releasing...
                        </>
                      ) : (
                        <>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Release Payment
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDisputeDialog(true)}
                      className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Open Dispute
                    </Button>
                  </>
                )}

                {order.status === "completed" && (isBuyer || isSeller) && (
                  <Button onClick={handleOpenReviewDialog} className="w-full bg-yellow-600 hover:bg-yellow-700">
                    <Star className="mr-2 h-4 w-4" />
                    {currentUserReview ? "Edit Review" : "Leave Review"}
                  </Button>
                )}

                {!showBuyerView && !showSellerView && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No actions available for current order status
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium">Order Created</p>
                      <p className="text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {order.acceptedAt && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">Order Accepted</p>
                        <p className="text-gray-500">{new Date(order.acceptedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {order.deliveredAt && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">Order Delivered</p>
                        <p className="text-gray-500">{new Date(order.deliveredAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {order.disputedAt && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">Dispute Opened</p>
                        <p className="text-gray-500">{new Date(order.disputedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {order.completedAt && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium">Order Completed</p>
                        <p className="text-gray-500">{new Date(order.completedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Leave a Review
              </DialogTitle>
              <div className="text-sm text-blue-600">
                Rate your experience with the {showBuyerView ? "seller" : "buyer"}
                <br />
                Order: {order.serviceName} • ${order.price}
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">
                  {showBuyerView ? "Rate your experience with the seller" : "Rate your experience with the buyer"}
                </p>
                <p className="text-xs text-blue-600">
                  Order: {order?.serviceName} • ${order?.price}
                </p>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold mb-3">Overall Rating</h3>
                <SimpleStarRating rating={reviewRating} onRatingChange={setReviewRating} size="h-8 w-8" />
                <p className="text-sm text-gray-600 mt-2">
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewRating] || "Select rating"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Communication</h4>
                  <SimpleStarRating rating={communicationRating} onRatingChange={setCommunicationRating} />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Quality</h4>
                  <SimpleStarRating rating={qualityRating} onRatingChange={setQualityRating} />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Value for Money</h4>
                  <SimpleStarRating rating={valueRating} onRatingChange={setValueRating} />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Delivery Time</h4>
                  <SimpleStarRating rating={deliveryTimeRating} onRatingChange={setDeliveryTimeRating} />
                </div>
              </div>

              {/* Review Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Review Title</label>
                <Input
                  placeholder="Summarize your experience in a few words..."
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 text-right">{reviewTitle.length}/100 characters</p>
              </div>

              {/* Review Comment */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Review Comment</label>
                <Textarea
                  placeholder="Share details about your experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 text-right">{reviewComment.length}/1000 characters</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowReviewDialog(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={
                    reviewRating === 0 ||
                    communicationRating === 0 ||
                    qualityRating === 0 ||
                    valueRating === 0 ||
                    deliveryTimeRating === 0 ||
                    !reviewTitle.trim() ||
                    actionLoading
                  }
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {currentUserReview ? "Updating..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <Star className="mr-2 h-4 w-4" />
                      {currentUserReview ? "Update Review" : "Submit Review"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delivery Dialog */}
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
                  onClick={handleSubmitDelivery}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? (
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
                    {(showBuyerView ? buyerDisputeReasons : sellerDisputeReasons).map((reason) => (
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
                    actionLoading
                  }
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {actionLoading ? (
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
                  Once you release the payment, the funds will be immediately transferred to the seller. Make sure you
                  are completely satisfied with the delivered work before proceeding.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Order Details:</p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Service: {order?.serviceName}</p>
                  <p>• Amount: ${order?.price}</p>
                  <p>• Seller: {order?.sellerId}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPaymentConfirmDialog(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReleasePayment}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? (
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

        {/* Accept Order Confirmation Dialog */}
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

        {/* Decline Order Dialog */}
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

        {/* Start Work Confirmation Dialog */}
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

        {/* Cancel Order Dialog */}
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
                }}
              >
                Keep Order
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelOrder}
                disabled={!cancelReason.trim() || cancelReason.trim().length < 10}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? (
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
      </div>
    </div>
  )
}
