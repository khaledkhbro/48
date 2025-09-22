import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createNotification } from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { title, message, notification_type, priority, target_type, target_users } = body

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const { data: result, error: sendError } = await supabase.rpc("send_admin_notification", {
      p_admin_id: user.id,
      p_title: title,
      p_message: message,
      p_notification_type: notification_type || "system",
      p_priority: priority || "normal",
      p_target_type: target_type || "all",
      p_target_users: target_users || null,
    })

    if (sendError) {
      console.error("Error sending admin notification:", sendError)
      return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
    }

    const { data: notificationData } = await supabase
      .from("admin_notifications")
      .select("total_recipients")
      .eq("id", result)
      .single()

    let targetUserIds: string[] = []
    if (target_type === "all") {
      const { data: allUsers } = await supabase.from("profiles").select("id").neq("user_type", "admin")
      targetUserIds = allUsers?.map((u) => u.id) || []
    } else if (target_type === "active") {
      const { data: activeUsers } = await supabase
        .from("profiles")
        .select("id")
        .neq("user_type", "admin")
        .gte("last_sign_in_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      targetUserIds = activeUsers?.map((u) => u.id) || []
    } else if (target_type === "specific" && target_users) {
      targetUserIds = target_users
    }

    const notificationPromises = targetUserIds.map((userId) =>
      createNotification({
        userId,
        type:
          notification_type === "announcement"
            ? "system"
            : notification_type === "warning"
              ? "system"
              : notification_type === "promotion"
                ? "system"
                : "system",
        title,
        description: message,
        priority: priority as "low" | "normal" | "high" | "urgent",
      }),
    )

    await Promise.all(notificationPromises)

    return NextResponse.json({
      success: true,
      notification_id: result,
      recipients_count: notificationData?.total_recipients || targetUserIds.length,
    })
  } catch (error) {
    console.error("Error in send notification API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
