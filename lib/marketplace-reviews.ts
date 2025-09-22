// Modern review system for marketplace - only buyers with completed orders can review
export interface MarketplaceReview {
  id: string
  serviceId: string
  orderId: string // Links review to specific completed order
  buyerId: string
  sellerId: string
  rating: number // Overall rating 1-5
  comment?: string
  // Rating breakdown categories
  sellerCommunication: number // 1-5
  qualityOfDelivery: number // 1-5
  valueOfDelivery: number // 1-5
  // Purchase details
  purchaseAmount: number
  purchaseDate: string
  deliveryTime: string
  createdAt: string
  updatedAt: string
  isVisible: boolean
  // User info
  buyer: {
    id: string
    firstName: string
    lastName: string
    username: string
    avatar?: string
    country?: string
  }
  // Order details for display
  order: {
    id: string
    tierName: string
    totalAmount: number
    completedAt: string
  }
}

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  ratingBreakdown: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  categoryAverages: {
    sellerCommunication: number
    qualityOfDelivery: number
    valueOfDelivery: number
  }
}

export interface OrderReview {
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

const MARKETPLACE_REVIEWS_KEY = "marketplace_reviews_v2"
const ORDER_REVIEWS_KEY = "order-reviews"

// Get all reviews from localStorage
const getStoredReviews = (): MarketplaceReview[] => {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(MARKETPLACE_REVIEWS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save reviews to localStorage
const saveReviews = (reviews: MarketplaceReview[]): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(MARKETPLACE_REVIEWS_KEY, JSON.stringify(reviews))
  } catch (error) {
    console.error("Failed to save marketplace reviews:", error)
  }
}

// Get all order reviews from localStorage
const getStoredOrderReviews = (): OrderReview[] => {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(ORDER_REVIEWS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save order reviews to localStorage
const saveOrderReviews = (reviews: OrderReview[]): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(ORDER_REVIEWS_KEY, JSON.stringify(reviews))
  } catch (error) {
    console.error("Failed to save order reviews:", error)
  }
}

// Check if user can review (has completed order for this service)
export async function canUserReview(
  buyerId: string,
  serviceId: string,
): Promise<{
  canReview: boolean
  completedOrders: any[]
  existingReviews: MarketplaceReview[]
}> {
  const { orderStorage } = await import("./local-storage")

  // Get user's completed orders for this service
  const allOrders = orderStorage.getAll()
  const completedOrders = allOrders.filter(
    (order) => order.buyerId === buyerId && order.marketplaceItemId === serviceId && order.status === "completed",
  )

  // Get existing reviews by this user for this service
  const reviews = getStoredReviews()
  const existingReviews = reviews.filter((review) => review.buyerId === buyerId && review.serviceId === serviceId)

  // User can review if they have more completed orders than reviews
  const canReview = completedOrders.length > existingReviews.length

  return { canReview, completedOrders, existingReviews }
}

// Submit a new review (only if user has completed order)
export async function submitMarketplaceReview(data: {
  serviceId: string
  orderId: string
  buyerId: string
  sellerId: string
  rating: number
  sellerCommunication: number
  qualityOfDelivery: number
  valueOfDelivery: number
  comment?: string
}): Promise<MarketplaceReview> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Verify user can review
  const { canReview, completedOrders } = await canUserReview(data.buyerId, data.serviceId)
  if (!canReview) {
    throw new Error("You can only review services you have purchased and completed")
  }

  // Find the specific order
  const order = completedOrders.find((o) => o.id === data.orderId)
  if (!order) {
    throw new Error("Order not found or not completed")
  }

  // Get service details
  const { getServiceById } = await import("./marketplace")
  const service = await getServiceById(data.serviceId)
  if (!service) {
    throw new Error("Service not found")
  }

  const newReview: MarketplaceReview = {
    id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    serviceId: data.serviceId,
    orderId: data.orderId,
    buyerId: data.buyerId,
    sellerId: data.sellerId,
    rating: Math.max(1, Math.min(5, Math.round(data.rating))),
    sellerCommunication: Math.max(1, Math.min(5, Math.round(data.sellerCommunication))),
    qualityOfDelivery: Math.max(1, Math.min(5, Math.round(data.qualityOfDelivery))),
    valueOfDelivery: Math.max(1, Math.min(5, Math.round(data.valueOfDelivery))),
    comment: data.comment?.trim() || undefined,
    purchaseAmount: order.amount,
    purchaseDate: order.createdAt,
    deliveryTime: order.deliveredAt
      ? Math.ceil(
          (new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        ) + " days"
      : "N/A",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isVisible: true,
    buyer: {
      id: data.buyerId,
      firstName: order.buyer.firstName,
      lastName: order.buyer.lastName,
      username: order.buyer.username,
      country: "US", // Default, could be enhanced
    },
    order: {
      id: order.id,
      tierName: "Standard", // Could be enhanced from order data
      totalAmount: order.amount,
      completedAt: order.completedAt || order.deliveredAt || new Date().toISOString(),
    },
  }

  const reviews = getStoredReviews()
  reviews.push(newReview)
  saveReviews(reviews)

  console.log("[v0] ✅ Marketplace review submitted:", newReview.id)
  return newReview
}

const convertOrderReviewToMarketplaceReview = async (orderReview: OrderReview): Promise<MarketplaceReview | null> => {
  try {
    const { orderStorage } = await import("./local-storage")

    let order = orderStorage.getById(orderReview.order_id)

    // If direct ID match fails, try to find order by other means
    if (!order) {
      console.log(`[v0] Direct order lookup failed for: ${orderReview.order_id}`)

      // Try to extract service ID from order ID pattern and find related orders
      const allOrders = orderStorage.getAll()

      // Look for orders that might match based on reviewer/reviewee IDs
      const potentialOrders = allOrders.filter(
        (o) =>
          (o.buyerId === orderReview.reviewer_id || o.sellerId === orderReview.reviewer_id) &&
          (o.buyerId === orderReview.reviewee_id || o.sellerId === orderReview.reviewee_id),
      )

      if (potentialOrders.length > 0) {
        // Use the most recent matching order
        order = potentialOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        console.log(`[v0] Found potential order match: ${order.id} for review ${orderReview.id}`)
      }
    }

    if (!order) {
      console.warn(`[v0] Order not found for review: ${orderReview.order_id}`)

      return {
        id: orderReview.id,
        serviceId: orderReview.order_id.replace(/^order_/, ""), // Extract potential service ID
        orderId: orderReview.order_id,
        buyerId: orderReview.reviewer_type === "buyer" ? orderReview.reviewer_id : orderReview.reviewee_id,
        sellerId: orderReview.reviewer_type === "seller" ? orderReview.reviewer_id : orderReview.reviewee_id,
        rating: orderReview.rating,
        sellerCommunication: orderReview.communication_rating,
        qualityOfDelivery: orderReview.quality_rating,
        valueOfDelivery: orderReview.value_rating,
        comment: orderReview.comment,
        purchaseAmount: 0, // Default since no order data
        purchaseDate: orderReview.created_at,
        deliveryTime: "N/A",
        createdAt: orderReview.created_at,
        updatedAt: orderReview.updated_at,
        isVisible: !orderReview.is_deleted,
        buyer: {
          id: orderReview.reviewer_type === "buyer" ? orderReview.reviewer_id : orderReview.reviewee_id,
          firstName: "Anonymous",
          lastName: "User",
          username: "user",
          country: "US",
        },
        order: {
          id: orderReview.order_id,
          tierName: "Standard",
          totalAmount: 0,
          completedAt: orderReview.created_at,
        },
      }
    }

    return {
      id: orderReview.id,
      serviceId: order.marketplaceItemId || "unknown",
      orderId: orderReview.order_id,
      buyerId: orderReview.reviewer_type === "buyer" ? orderReview.reviewer_id : orderReview.reviewee_id,
      sellerId: orderReview.reviewer_type === "seller" ? orderReview.reviewer_id : orderReview.reviewee_id,
      rating: orderReview.rating,
      sellerCommunication: orderReview.communication_rating,
      qualityOfDelivery: orderReview.quality_rating,
      valueOfDelivery: orderReview.value_rating,
      comment: orderReview.comment,
      purchaseAmount: order.amount || 0,
      purchaseDate: order.createdAt,
      deliveryTime: order.deliveredAt
        ? Math.ceil(
            (new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24),
          ) + " days"
        : "N/A",
      createdAt: orderReview.created_at,
      updatedAt: orderReview.updated_at,
      isVisible: !orderReview.is_deleted,
      buyer: {
        id: orderReview.reviewer_type === "buyer" ? orderReview.reviewer_id : orderReview.reviewee_id,
        firstName: order.buyer?.firstName || "Anonymous",
        lastName: order.buyer?.lastName || "User",
        username: order.buyer?.username || "user",
        country: "US", // Default
      },
      order: {
        id: order.id,
        tierName: order.tierName || "Standard",
        totalAmount: order.amount || 0,
        completedAt: order.completedAt || order.deliveredAt || orderReview.created_at,
      },
    }
  } catch (error) {
    console.error(`[v0] Failed to convert order review ${orderReview.id}:`, error)
    return null
  }
}

// Get reviews for a service with search and sorting
export async function getServiceReviews(
  serviceId: string,
  options: {
    search?: string
    sortBy?: "most_recent" | "most_relevant" | "highest_rating" | "lowest_rating"
    limit?: number
    offset?: number
  } = {},
): Promise<MarketplaceReview[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  // Get localStorage reviews
  const localReviews = getStoredReviews().filter((review) => review.serviceId === serviceId && review.isVisible)

  let apiReviews: MarketplaceReview[] = []
  try {
    const orderReviews = await fetchOrderReviewsFromAPI()
    const convertedReviews = await Promise.all(
      orderReviews
        .filter((review) => review.reviewer_type === "buyer" && !review.is_deleted)
        .map(convertOrderReviewToMarketplaceReview),
    )

    apiReviews = convertedReviews.filter((review): review is MarketplaceReview => {
      if (!review) return false

      // Direct service ID match
      if (review.serviceId === serviceId) return true

      // Try to match by extracting service ID from order ID
      const extractedServiceId = review.orderId.replace(/^order_/, "").split("_")[0]
      if (extractedServiceId === serviceId) return true

      // If service ID is unknown, include it as a potential match
      if (review.serviceId === "unknown" || review.serviceId.includes(serviceId)) return true

      return false
    })

    console.log(`[v0] Converted ${apiReviews.length} API reviews for service ${serviceId}`)
  } catch (error) {
    console.error("[v0] Failed to fetch/convert API reviews:", error)
  }

  const allReviews = [...localReviews]
  for (const apiReview of apiReviews) {
    const isDuplicate = localReviews.some(
      (localReview) => localReview.orderId === apiReview.orderId && localReview.buyerId === apiReview.buyerId,
    )
    if (!isDuplicate) {
      allReviews.push(apiReview)
    }
  }

  let reviews = allReviews

  // Apply search filter
  if (options.search) {
    const searchTerm = options.search.toLowerCase()
    reviews = reviews.filter(
      (review) =>
        review.comment?.toLowerCase().includes(searchTerm) ||
        review.buyer.firstName.toLowerCase().includes(searchTerm) ||
        review.buyer.lastName.toLowerCase().includes(searchTerm) ||
        review.buyer.username.toLowerCase().includes(searchTerm),
    )
  }

  // Apply sorting
  switch (options.sortBy) {
    case "most_recent":
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case "most_relevant":
      // Sort by rating and recency combined
      reviews.sort((a, b) => {
        const aScore = a.rating * 0.7 + (new Date(a.createdAt).getTime() / 1000000000) * 0.3
        const bScore = b.rating * 0.7 + (new Date(b.createdAt).getTime() / 1000000000) * 0.3
        return bScore - aScore
      })
      break
    case "highest_rating":
      reviews.sort((a, b) => b.rating - a.rating)
      break
    case "lowest_rating":
      reviews.sort((a, b) => a.rating - b.rating)
      break
    default:
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Apply pagination
  if (options.offset) {
    reviews = reviews.slice(options.offset)
  }
  if (options.limit) {
    reviews = reviews.slice(0, options.limit)
  }

  return reviews
}

// Calculate review statistics for a service
export async function getServiceReviewStats(serviceId: string): Promise<ReviewStats> {
  await new Promise((resolve) => setTimeout(resolve, 100))

  const reviews = await getServiceReviews(serviceId, { limit: 1000 }) // Get all reviews

  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      categoryAverages: {
        sellerCommunication: 0,
        qualityOfDelivery: 0,
        valueOfDelivery: 0,
      },
    }
  }

  // Calculate rating breakdown
  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.forEach((review) => {
    ratingBreakdown[review.rating as keyof typeof ratingBreakdown]++
  })

  // Calculate averages
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
  const totalCommunication = reviews.reduce((sum, review) => sum + review.sellerCommunication, 0)
  const totalQuality = reviews.reduce((sum, review) => sum + review.qualityOfDelivery, 0)
  const totalValue = reviews.reduce((sum, review) => sum + review.valueOfDelivery, 0)

  return {
    totalReviews: reviews.length,
    averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
    ratingBreakdown,
    categoryAverages: {
      sellerCommunication: Math.round((totalCommunication / reviews.length) * 10) / 10,
      qualityOfDelivery: Math.round((totalQuality / reviews.length) * 10) / 10,
      valueOfDelivery: Math.round((totalValue / reviews.length) * 10) / 10,
    },
  }
}

// Get user's purchase history for a service (for review eligibility)
export async function getUserPurchaseHistory(
  buyerId: string,
  serviceId: string,
): Promise<{
  completedOrders: any[]
  availableForReview: any[]
  reviewedOrders: string[]
}> {
  const { orderStorage } = await import("./local-storage")

  const allOrders = orderStorage.getAll()
  const completedOrders = allOrders.filter(
    (order) => order.buyerId === buyerId && order.marketplaceItemId === serviceId && order.status === "completed",
  )

  const reviews = getStoredReviews()
  const reviewedOrders = reviews
    .filter((review) => review.buyerId === buyerId && review.serviceId === serviceId)
    .map((review) => review.orderId)

  const availableForReview = completedOrders.filter((order) => !reviewedOrders.includes(order.id))

  return {
    completedOrders,
    availableForReview,
    reviewedOrders,
  }
}

// Initialize with some sample reviews for testing
export async function initializeSampleReviews(): Promise<void> {
  if (typeof window === "undefined") return

  const existing = getStoredReviews()
  if (existing.length > 0) return // Already has data

  const sampleReviews: MarketplaceReview[] = [
    {
      id: "review_sample_1",
      serviceId: "2",
      orderId: "order_sample_1",
      buyerId: "buyer_1",
      sellerId: "seller2",
      rating: 5,
      sellerCommunication: 5,
      qualityOfDelivery: 5,
      valueOfDelivery: 5,
      comment:
        "Outstanding work! Emma delivered exactly what I needed and was very responsive throughout the process. The logo design exceeded my expectations and really captures our brand identity perfectly.",
      purchaseAmount: 150,
      purchaseDate: "2024-01-15T10:00:00Z",
      deliveryTime: "2 days",
      createdAt: "2024-01-18T14:30:00Z",
      updatedAt: "2024-01-18T14:30:00Z",
      isVisible: true,
      buyer: {
        id: "buyer_1",
        firstName: "Michael",
        lastName: "Johnson",
        username: "mjohnson_biz",
        country: "US",
      },
      order: {
        id: "order_sample_1",
        tierName: "Standard",
        totalAmount: 150,
        completedAt: "2024-01-18T12:00:00Z",
      },
    },
    {
      id: "review_sample_2",
      serviceId: "2",
      orderId: "order_sample_2",
      buyerId: "buyer_2",
      sellerId: "seller2",
      rating: 5,
      sellerCommunication: 5,
      qualityOfDelivery: 5,
      valueOfDelivery: 4,
      comment:
        "Great experience overall. The communication was excellent and the final product was very professional. Minor revisions were handled quickly.",
      purchaseAmount: 250,
      purchaseDate: "2024-01-10T08:00:00Z",
      deliveryTime: "3 days",
      createdAt: "2024-01-14T16:45:00Z",
      updatedAt: "2024-01-14T16:45:00Z",
      isVisible: true,
      buyer: {
        id: "buyer_2",
        firstName: "Sarah",
        lastName: "Chen",
        username: "sarahc_startup",
        country: "CA",
      },
      order: {
        id: "order_sample_2",
        tierName: "Premium",
        totalAmount: 250,
        completedAt: "2024-01-13T15:30:00Z",
      },
    },
    {
      id: "review_sample_3",
      serviceId: "2",
      orderId: "order_sample_3",
      buyerId: "buyer_3",
      sellerId: "seller2",
      rating: 4,
      sellerCommunication: 4,
      qualityOfDelivery: 5,
      valueOfDelivery: 4,
      comment:
        "Great work overall. The design was creative and met our requirements. Communication could have been a bit more frequent, but the end result was worth it.",
      purchaseAmount: 100,
      purchaseDate: "2024-01-05T12:00:00Z",
      deliveryTime: "4 days",
      createdAt: "2024-01-10T09:20:00Z",
      updatedAt: "2024-01-10T09:20:00Z",
      isVisible: true,
      buyer: {
        id: "buyer_3",
        firstName: "David",
        lastName: "Rodriguez",
        username: "drodriguez_tech",
        country: "MX",
      },
      order: {
        id: "order_sample_3",
        tierName: "Basic",
        totalAmount: 100,
        completedAt: "2024-01-09T18:00:00Z",
      },
    },
    {
      id: "review_sample_4",
      serviceId: "2",
      orderId: "order_sample_4",
      buyerId: "buyer_4",
      sellerId: "seller2",
      rating: 5,
      sellerCommunication: 5,
      qualityOfDelivery: 5,
      valueOfDelivery: 5,
      comment:
        "Absolutely fantastic! This is my third project with this seller and they never disappoint. Fast delivery, excellent communication, and top-quality work every time.",
      purchaseAmount: 200,
      purchaseDate: "2024-01-20T14:00:00Z",
      deliveryTime: "1 day",
      createdAt: "2024-01-22T11:15:00Z",
      updatedAt: "2024-01-22T11:15:00Z",
      isVisible: true,
      buyer: {
        id: "buyer_4",
        firstName: "Lisa",
        lastName: "Thompson",
        username: "lisa_creative",
        country: "AU",
      },
      order: {
        id: "order_sample_4",
        tierName: "Standard",
        totalAmount: 200,
        completedAt: "2024-01-21T16:30:00Z",
      },
    },
    {
      id: "review_sample_5",
      serviceId: "2",
      orderId: "order_sample_5",
      buyerId: "buyer_5",
      sellerId: "seller2",
      rating: 4,
      sellerCommunication: 4,
      qualityOfDelivery: 4,
      valueOfDelivery: 5,
      comment:
        "Good value for money. The work was completed as requested and the seller was helpful with revisions. Would work with them again.",
      purchaseAmount: 75,
      purchaseDate: "2024-01-25T09:00:00Z",
      deliveryTime: "2 days",
      createdAt: "2024-01-28T13:45:00Z",
      updatedAt: "2024-01-28T13:45:00Z",
      isVisible: true,
      buyer: {
        id: "buyer_5",
        firstName: "James",
        lastName: "Wilson",
        username: "jwilson_biz",
        country: "UK",
      },
      order: {
        id: "order_sample_5",
        tierName: "Basic",
        totalAmount: 75,
        completedAt: "2024-01-27T15:20:00Z",
      },
    },
  ]

  saveReviews(sampleReviews)
  console.log("[v0] ✅ Sample marketplace reviews initialized")
}

// Get seller's reviews across all services
export async function getSellerReviews(
  sellerId: string,
  options: {
    search?: string
    sortBy?: "most_recent" | "most_relevant" | "highest_rating" | "lowest_rating"
    limit?: number
    offset?: number
  } = {},
): Promise<MarketplaceReview[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  // Get localStorage reviews
  const localReviews = getStoredReviews().filter((review) => review.sellerId === sellerId && review.isVisible)

  let apiReviews: MarketplaceReview[] = []
  try {
    const orderReviews = await fetchOrderReviewsFromAPI(sellerId)
    const convertedReviews = await Promise.all(
      orderReviews
        .filter((review) => review.reviewer_type === "buyer" && !review.is_deleted)
        .map(convertOrderReviewToMarketplaceReview),
    )

    apiReviews = convertedReviews.filter((review): review is MarketplaceReview => {
      if (!review) return false

      // Direct service ID match
      if (review.serviceId === sellerId) return true

      // Try to match by extracting service ID from order ID
      const extractedServiceId = review.orderId.replace(/^order_/, "").split("_")[0]
      if (extractedServiceId === sellerId) return true

      // If service ID is unknown, include it as a potential match
      if (review.serviceId === "unknown" || review.serviceId.includes(sellerId)) return true

      return false
    })

    console.log(`[v0] Converted ${apiReviews.length} API reviews for seller ${sellerId}`)
  } catch (error) {
    console.error("[v0] Failed to fetch/convert API reviews for seller:", error)
  }

  const allReviews = [...localReviews]
  for (const apiReview of apiReviews) {
    const isDuplicate = localReviews.some(
      (localReview) => localReview.orderId === apiReview.orderId && localReview.buyerId === apiReview.buyerId,
    )
    if (!isDuplicate) {
      allReviews.push(apiReview)
    }
  }

  let reviews = allReviews

  // Apply search filter
  if (options.search) {
    const searchTerm = options.search.toLowerCase()
    reviews = reviews.filter(
      (review) =>
        review.comment?.toLowerCase().includes(searchTerm) ||
        review.buyer.firstName.toLowerCase().includes(searchTerm) ||
        review.buyer.lastName.toLowerCase().includes(searchTerm) ||
        review.buyer.username.toLowerCase().includes(searchTerm),
    )
  }

  // Apply sorting
  switch (options.sortBy) {
    case "most_recent":
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case "most_relevant":
      reviews.sort((a, b) => {
        const aScore = a.rating * 0.7 + (new Date(a.createdAt).getTime() / 1000000000) * 0.3
        const bScore = b.rating * 0.7 + (new Date(b.createdAt).getTime() / 1000000000) * 0.3
        return bScore - aScore
      })
      break
    case "highest_rating":
      reviews.sort((a, b) => b.rating - a.rating)
      break
    case "lowest_rating":
      reviews.sort((a, b) => a.rating - b.rating)
      break
    default:
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Apply pagination
  if (options.offset) {
    reviews = reviews.slice(options.offset)
  }
  if (options.limit) {
    reviews = reviews.slice(0, options.limit)
  }

  return reviews
}

// Get seller's total review stats across all services
export async function getSellerReviewStats(sellerId: string): Promise<ReviewStats & { totalProjects: number }> {
  await new Promise((resolve) => setTimeout(resolve, 100))

  const reviews = await getSellerReviews(sellerId, { limit: 1000 }) // Get all reviews

  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      categoryAverages: {
        sellerCommunication: 0,
        qualityOfDelivery: 0,
        valueOfDelivery: 0,
      },
      totalProjects: 0,
    }
  }

  // Calculate rating breakdown
  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.forEach((review) => {
    ratingBreakdown[review.rating as keyof typeof ratingBreakdown]++
  })

  // Calculate averages
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
  const totalCommunication = reviews.reduce((sum, review) => sum + review.sellerCommunication, 0)
  const totalQuality = reviews.reduce((sum, review) => sum + review.qualityOfDelivery, 0)
  const totalValue = reviews.reduce((sum, review) => sum + review.valueOfDelivery, 0)

  // Count unique services (projects)
  const uniqueServices = new Set(reviews.map((review) => review.serviceId))

  return {
    totalReviews: reviews.length,
    averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
    ratingBreakdown,
    categoryAverages: {
      sellerCommunication: Math.round((totalCommunication / reviews.length) * 10) / 10,
      qualityOfDelivery: Math.round((totalQuality / reviews.length) * 10) / 10,
      valueOfDelivery: Math.round((totalValue / reviews.length) * 10) / 10,
    },
    totalProjects: uniqueServices.size,
  }
}

// Submit order reviews
export const submitOrderReview = async (reviewData: {
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
}): Promise<OrderReview> => {
  console.log("[v0] Submitting order review via API:", reviewData)

  try {
    const response = await fetch("/api/marketplace/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to submit review")
    }

    const newReview = await response.json()
    console.log("[v0] ✅ Review submitted successfully via API:", newReview.id)

    // Also save to localStorage as backup for immediate UI updates
    const reviews = getStoredOrderReviews()
    const existingIndex = reviews.findIndex(
      (r) =>
        r.order_id === reviewData.orderId &&
        r.reviewer_id === reviewData.reviewerId &&
        r.reviewer_type === reviewData.reviewerType,
    )

    if (existingIndex >= 0) {
      reviews[existingIndex] = newReview
    } else {
      reviews.push(newReview)
    }

    saveOrderReviews(reviews)
    return newReview
  } catch (error) {
    console.error("[v0] ❌ Failed to submit review via API:", error)
    throw error
  }
}

// Get review by order and reviewer with type
export const getOrderReviewByReviewer = (
  orderId: string,
  reviewerId: string,
  reviewerType: "buyer" | "seller",
): OrderReview | null => {
  const reviews = getStoredOrderReviews()
  return (
    reviews.find(
      (r) =>
        r.order_id === orderId && r.reviewer_id === reviewerId && r.reviewer_type === reviewerType && !r.is_deleted,
    ) || null
  )
}

export const fetchOrderReviewsFromAPI = async (revieweeId?: string): Promise<OrderReview[]> => {
  try {
    const url = revieweeId ? `/api/marketplace/reviews?revieweeId=${revieweeId}` : "/api/marketplace/reviews"

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error("Failed to fetch reviews from API")
    }

    const data = await response.json()
    console.log("[v0] ✅ Fetched reviews from API:", data.reviews?.length || 0)
    return data.reviews || []
  } catch (error) {
    console.error("[v0] ❌ Failed to fetch reviews from API:", error)
    // Fallback to localStorage
    return getStoredOrderReviews()
  }
}
