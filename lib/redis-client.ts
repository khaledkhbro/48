class RedisClient {
  private client: any = null
  private isConnected = false
  private inMemoryStore: Map<string, any> = new Map()

  async connect() {
    if (this.isConnected && this.client) {
      return this.client
    }

    try {
      const redisUrl = process.env.REDIS_URL

      if (!redisUrl) {
        console.warn("[v0] REDIS_URL not found, using in-memory fallback for chat")
        // Return a mock client for development
        return this.getMockClient()
      }

      let createClient
      try {
        const redisModule = await import("redis")
        createClient = redisModule.createClient
      } catch (importError) {
        console.warn("[v0] Redis package not available, using in-memory fallback")
        return this.getMockClient()
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        },
      })

      this.client.on("error", (err: any) => {
        console.error("[v0] Redis Client Error:", err)
        this.isConnected = false
      })

      this.client.on("connect", () => {
        console.log("[v0] Redis Client Connected")
        this.isConnected = true
      })

      await this.client.connect()
      return this.client
    } catch (error) {
      console.error("[v0] Failed to connect to Redis:", error)
      console.warn("[v0] Falling back to in-memory storage for development")
      return this.getMockClient()
    }
  }

  private getMockClient() {
    return {
      lPush: async (key: string, value: string) => {
        const existing = this.inMemoryStore.get(key) || []
        existing.unshift(value)
        this.inMemoryStore.set(key, existing)
      },
      lRange: async (key: string, start: number, end: number) => {
        const data = this.inMemoryStore.get(key) || []
        return end === -1 ? data : data.slice(start, end + 1)
      },
      setEx: async (key: string, ttl: number, value: string) => {
        this.inMemoryStore.set(key, value)
        // In production, implement TTL cleanup
      },
      get: async (key: string) => {
        return this.inMemoryStore.get(key) || null
      },
      del: async (key: string) => {
        this.inMemoryStore.delete(key)
      },
      expire: async (key: string, ttl: number) => {
        // Mock implementation - in production, implement TTL
        return true
      },
      keys: async (pattern: string) => {
        return Array.from(this.inMemoryStore.keys()).filter((key) =>
          pattern.includes("*") ? key.includes(pattern.replace("*", "")) : key === pattern,
        )
      },
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect()
      this.isConnected = false
    }
  }

  async storeMessage(sessionId: string, message: any, ttl = 172800) {
    // 2 days TTL
    const client = await this.connect()
    const key = `chat:${sessionId}:messages`

    await client.lPush(
      key,
      JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }),
    )

    // Set TTL for auto-deletion after 2 days
    await client.expire(key, ttl)
  }

  async getMessages(sessionId: string) {
    const client = await this.connect()
    const key = `chat:${sessionId}:messages`

    const messages = await client.lRange(key, 0, -1)
    return messages.map((msg: string) => JSON.parse(msg)).reverse()
  }

  async storeSession(sessionId: string, sessionData: any, ttl = 172800) {
    const client = await this.connect()
    const key = `session:${sessionId}`

    await client.setEx(
      key,
      ttl,
      JSON.stringify({
        ...sessionData,
        lastActivity: Date.now(),
      }),
    )
  }

  async getSession(sessionId: string) {
    const client = await this.connect()
    const key = `session:${sessionId}`

    const session = await client.get(key)
    return session ? JSON.parse(session) : null
  }

  async deleteSession(sessionId: string) {
    const client = await this.connect()
    await client.del(`session:${sessionId}`)
    await client.del(`chat:${sessionId}:messages`)
  }

  async storeFCMToken(sessionId: string, token: string, ttl = 172800) {
    const client = await this.connect()
    const key = `fcm:${sessionId}`

    await client.setEx(key, ttl, token)
  }

  async getFCMToken(sessionId: string) {
    const client = await this.connect()
    const key = `fcm:${sessionId}`

    return await client.get(key)
  }

  async getActiveSessions(status?: string) {
    const client = await this.connect()
    const sessionKeys = await client.keys("session:*")

    const sessions = []
    for (const key of sessionKeys) {
      const sessionData = await client.get(key)
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData)
          if (!status || session.status === status) {
            sessions.push({
              sessionId: session.sessionId,
              status: session.status,
              createdAt: session.createdAt,
              lastActivity: session.lastActivity,
              agentId: session.agentId,
              userIP: session.userIP?.substring(0, 8) + "...", // Partial IP for privacy
            })
          }
        } catch (parseError) {
          console.error("[v0] Error parsing session data:", parseError)
        }
      }
    }

    return sessions
  }
}

// Singleton instance
const redisClient = new RedisClient()

export default redisClient
