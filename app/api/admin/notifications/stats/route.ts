import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET() {
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

    // Get user targeting statistics
    const { data: stats, error } = await supabase.rpc("get_user_targeting_stats")

    if (error) {
      console.error("Error fetching user stats:", error)
      return NextResponse.json({ error: "Failed to fetch user statistics" }, { status: 500 })
    }

    return NextResponse.json(
      stats?.[0] || {
        total_users: 0,
        active_users: 0,
        job_posters: 0,
        workers: 0,
        verified_users: 0,
        new_users_30d: 0,
      },
    )
  } catch (error) {
    console.error("Error in user stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
