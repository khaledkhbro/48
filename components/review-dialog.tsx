"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import type { MarketplaceOrder } from "@/lib/marketplace-orders"
import { submitOrderReview, getOrderReviewByReviewer } from "@/lib/marketplace-reviews"

interface ReviewDialogProps {
  order: MarketplaceOrder
  userRole: "buyer" | "seller"
  onClose: () => void
  onSubmit: () => void
}

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

const SimpleStarRating = ({
  rating,
  onRatingChange,
  label,
}: {
  rating: number
  onRatingChange: (rating: number) => void
  label: string
}) => {
  const [hoveredRating, setHoveredRating] = useState(0)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="focus:outline-none transition-colors"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export function ReviewDialog({ order, userRole, onClose, onSubmit }: ReviewDialogProps) {
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [existingReview, setExistingReview] = useState<MarketplaceReview | null>(null)
  const [loading, setLoading] = useState(false)

  const [reviewData, setReviewData] = useState({
    overallRating: 5,
    communication: 5,
    quality: 5,
    valueForMoney: 5,
    deliveryTime: 5,
    title: "",
    comment: "",
  })

  useEffect(() => {
    // Get current user ID from order data
    const userId = userRole === "buyer" ? order.buyerId : order.sellerId
    setCurrentUserId(userId)

    // Load existing review if it exists
    const review = getOrderReviewByReviewer(order.id, userId, userRole)
    setExistingReview(review)

    if (review) {
      setReviewData({
        overallRating: review.rating,
        communication: review.communication_rating,
        quality: review.quality_rating,
        valueForMoney: review.value_rating,
        deliveryTime: review.delivery_time_rating,
        title: review.title,
        comment: review.comment,
      })
    }
  }, [order, userRole])

  const handleSubmit = async () => {
    if (!currentUserId) return

    if (!reviewData.title.trim() || !reviewData.comment.trim()) {
      alert("Please provide both a title and comment for your review")
      return
    }

    setLoading(true)
    try {
      const revieweeId = userRole === "buyer" ? order.sellerId : order.buyerId

      console.log(`[v0] Submitting review for order: ${order.id}`)

      await submitOrderReview({
        orderId: order.id, // Use the actual order ID from the order object
        reviewerId: currentUserId,
        revieweeId: revieweeId,
        reviewerType: userRole,
        rating: reviewData.overallRating,
        title: reviewData.title,
        comment: reviewData.comment,
        communicationRating: reviewData.communication,
        qualityRating: reviewData.quality,
        valueRating: reviewData.valueForMoney,
        deliveryTimeRating: reviewData.deliveryTime,
      })

      // Dispatch custom events to notify other components
      window.dispatchEvent(new CustomEvent("reviewsUpdated"))
      window.dispatchEvent(new CustomEvent("reviewSubmitted"))

      console.log(`[v0] ✅ Review submitted successfully for order ${order.id}`)
      alert(`Review ${existingReview ? "updated" : "submitted"} successfully!`)
      onSubmit()
    } catch (error) {
      console.error("[v0] ❌ Error submitting review:", error)
      alert("Failed to submit review. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getRatingLabel = (rating: number) => {
    if (rating === 0) return ""
    if (rating <= 2) return "Poor"
    if (rating <= 3) return "Fair"
    if (rating <= 4) return "Good"
    return "Excellent"
  }

  const isEditing = existingReview !== null

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>{isEditing ? "Edit Review" : "Leave a Review"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-1">
              Rate your experience with the {userRole === "buyer" ? "seller" : "buyer"}
            </h3>
            <p className="text-sm text-blue-700">
              Order: {order.serviceTitle} • ${order.price}
            </p>
          </div>

          {/* Overall Rating */}
          <div className="text-center">
            <SimpleStarRating
              rating={reviewData.overallRating}
              onRatingChange={(rating) => setReviewData((prev) => ({ ...prev, overallRating: rating }))}
              label="Overall Rating"
            />
            <p className="text-sm text-gray-600 mt-1">{getRatingLabel(reviewData.overallRating)}</p>
          </div>

          {/* Category Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SimpleStarRating
              rating={reviewData.communication}
              onRatingChange={(rating) => setReviewData((prev) => ({ ...prev, communication: rating }))}
              label="Communication"
            />
            <SimpleStarRating
              rating={reviewData.quality}
              onRatingChange={(rating) => setReviewData((prev) => ({ ...prev, quality: rating }))}
              label="Quality"
            />
            <SimpleStarRating
              rating={reviewData.valueForMoney}
              onRatingChange={(rating) => setReviewData((prev) => ({ ...prev, valueForMoney: rating }))}
              label="Value for Money"
            />
            <SimpleStarRating
              rating={reviewData.deliveryTime}
              onRatingChange={(rating) => setReviewData((prev) => ({ ...prev, deliveryTime: rating }))}
              label="Delivery Time"
            />
          </div>

          {/* Review Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Review Title</label>
            <Input
              value={reviewData.title}
              onChange={(e) => setReviewData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Summarize your experience in a few words..."
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{reviewData.title.length}/100 characters</p>
          </div>

          {/* Review Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Review Comment</label>
            <Textarea
              value={reviewData.comment}
              onChange={(e) => setReviewData((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Share details about your experience..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">{reviewData.comment.length}/1000 characters</p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={!reviewData.title.trim() || !reviewData.comment.trim() || loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? "Updating..." : "Submitting..."}
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Review" : "Submit Review"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
