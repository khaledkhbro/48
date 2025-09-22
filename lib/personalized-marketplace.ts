interface UserBehavior {
  userId: string
  sessionId: string
  searchQuery?: string
  searchType: "keyword" | "category" | "subcategory" | "micro_category"
  categoryId?: number
  subcategoryId?: number
  microCategoryId?: number
  resultsCount?: number
  clickedServiceId?: number
  timeSpentSeconds?: number
}

interface PersonalizedService {
  id: number
  title: string
  description: string
  price: number
  category_name: string
  subcategory_name: string
  personalization_score: number
  personalization_reason: string
  view_count: number
  order_count: number
  rating: number
  seller_name: string
}

export class PersonalizedMarketplace {
  private static instance: PersonalizedMarketplace
  private behaviorQueue: UserBehavior[] = []
  private flushInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Start behavior tracking queue flush
    this.startBehaviorFlush()
  }

  public static getInstance(): PersonalizedMarketplace {
    if (!PersonalizedMarketplace.instance) {
      PersonalizedMarketplace.instance = new PersonalizedMarketplace()
    }
    return PersonalizedMarketplace.instance
  }

  // Track user search behavior
  public trackBehavior(behavior: UserBehavior): void {
    this.behaviorQueue.push({
      ...behavior,
      sessionId: behavior.sessionId || this.generateSessionId(),
    })

    // Flush immediately if queue is getting large
    if (this.behaviorQueue.length >= 10) {
      this.flushBehaviorQueue()
    }
  }

  // Track search query
  public trackSearch(userId: string, query: string, resultsCount: number): void {
    this.trackBehavior({
      userId,
      sessionId: this.getSessionId(),
      searchQuery: query,
      searchType: "keyword",
      resultsCount,
    })
  }

  // Track category browsing
  public trackCategoryView(userId: string, categoryId: number, subcategoryId?: number, microCategoryId?: number): void {
    const searchType = microCategoryId ? "micro_category" : subcategoryId ? "subcategory" : "category"

    this.trackBehavior({
      userId,
      sessionId: this.getSessionId(),
      searchType,
      categoryId,
      subcategoryId,
      microCategoryId,
    })
  }

  // Track service click
  public trackServiceClick(
    userId: string,
    serviceId: number,
    categoryId?: number,
    subcategoryId?: number,
    microCategoryId?: number,
  ): void {
    this.trackBehavior({
      userId,
      sessionId: this.getSessionId(),
      searchType: "keyword",
      clickedServiceId: serviceId,
      categoryId,
      subcategoryId,
      microCategoryId,
    })
  }

  // Track time spent on service
  public trackTimeSpent(userId: string, serviceId: number, seconds: number): void {
    this.trackBehavior({
      userId,
      sessionId: this.getSessionId(),
      searchType: "keyword",
      clickedServiceId: serviceId,
      timeSpentSeconds: seconds,
    })
  }

  // Get personalized services for user
  public async getPersonalizedServices(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{
    services: PersonalizedService[]
    personalized: boolean
    reason: string
  }> {
    try {
      const response = await fetch(`/api/marketplace/personalized?userId=${userId}&limit=${limit}&offset=${offset}`)

      if (!response.ok) {
        throw new Error("Failed to fetch personalized services")
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching personalized services:", error)

      // Fallback to general services
      return {
        services: [],
        personalized: false,
        reason: "Error loading personalized content - showing general services",
      }
    }
  }

  // Get services for anonymous users
  public async getGeneralServices(
    limit = 20,
    offset = 0,
  ): Promise<{
    services: PersonalizedService[]
    personalized: boolean
    reason: string
  }> {
    return this.getPersonalizedServices("", limit, offset)
  }

  // Private methods
  private startBehaviorFlush(): void {
    this.flushInterval = setInterval(() => {
      if (this.behaviorQueue.length > 0) {
        this.flushBehaviorQueue()
      }
    }, 5000) // Flush every 5 seconds
  }

  private async flushBehaviorQueue(): Promise<void> {
    if (this.behaviorQueue.length === 0) return

    const behaviors = [...this.behaviorQueue]
    this.behaviorQueue = []

    try {
      // Send behaviors to API in batch
      for (const behavior of behaviors) {
        await fetch("/api/marketplace/personalized", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(behavior),
        })
      }
    } catch (error) {
      console.error("Error flushing behavior queue:", error)
      // Re-add failed behaviors to queue
      this.behaviorQueue.unshift(...behaviors)
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem("marketplace_session_id")
    if (!sessionId) {
      sessionId = this.generateSessionId()
      sessionStorage.setItem("marketplace_session_id", sessionId)
    }
    return sessionId
  }

  // Cleanup on page unload
  public cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flushBehaviorQueue()
  }
}

// Export singleton instance
export const personalizedMarketplace = PersonalizedMarketplace.getInstance()

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    personalizedMarketplace.cleanup()
  })
}
