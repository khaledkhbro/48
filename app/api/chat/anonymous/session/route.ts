import { type NextRequest, NextResponse } from "next/server"
import { createAnonymousSession, getSessionInfo, isValidSessionId } from "@/lib/anonymous-chat-utils"
import { triggerWelcomeMessage, scheduleAutomatedMessages } from "@/lib/automated-chat-messages"
import { notifyNewAnonymousSession } from "@/lib/multi-channel-notifications"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Creating anonymous chat session...")
    const userIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const sessionId = await createAnonymousSession(userIP, userAgent)
    console.log("[v0] Session created successfully:", sessionId)

    try {
      await triggerWelcomeMessage(sessionId)
      console.log("[v0] Welcome message triggered")
    } catch (automationError) {
      console.error("[v0] Failed to trigger welcome message:", automationError)
    }

    try {
      await scheduleAutomatedMessages(sessionId)
      console.log("[v0] Automated messages scheduled")
    } catch (automationError) {
      console.error("[v0] Failed to schedule automated messages:", automationError)
    }

    try {
      await notifyNewAnonymousSession(sessionId)
      console.log("[v0] New session notification sent")
    } catch (automationError) {
      console.error("[v0] Failed to send new session notification:", automationError)
    }

    return NextResponse.json({
      success: true,
      sessionId,
      message: "Anonymous chat session created",
    })
  } catch (error) {
    console.error("[v0] Error creating anonymous session:", error)
    return NextResponse.json({ error: "Failed to create chat session" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSessionInfo(sessionId)

    if (!session) {
      return NextResponse.json({ error: "Session not found or expired" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        agentId: session.agentId,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching session:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}
