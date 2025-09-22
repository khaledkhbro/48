import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get current user and verify admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (roleError || !userRole || !["admin", "moderator"].includes(userRole.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const disputeId = params.id

    // Get dispute actions
    const { data: actions, error } = await supabase
      .from("dispute_actions")
      .select("*")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching dispute actions:", error)
      return NextResponse.json({ error: "Failed to fetch dispute actions" }, { status: 500 })
    }

    return NextResponse.json(actions || [])
  } catch (error) {
    console.error("Error in dispute actions API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
