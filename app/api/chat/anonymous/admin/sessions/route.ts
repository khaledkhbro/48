import { type NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import redisClient from "@/lib/redis-client"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user || (user.userType !== "admin" && user.userType !== "agent")) {
      return NextResponse.json({ error: "Unauthorized - admin or agent access required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "active"

    console.log("[v0] Fetching admin sessions with status:", status)

    const sessions = await redisClient.getActiveSessions(status)

    console.log("[v0] Found sessions:", sessions.length)

    // Sort by last activity (most recent first)
    sessions.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))

    return NextResponse.json({
      success: true,
      sessions,
      total: sessions.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching admin sessions:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}
