import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
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

    // Get all disputes with related data
    const { data: disputes, error } = await supabase
      .from("disputes")
      .select(`
        *,
        job:jobs!disputes_job_id_fkey(id, title, budget_min, budget_max),
        reporter:auth.users!disputes_reporter_id_fkey(id, email, raw_user_meta_data),
        reported_user:auth.users!disputes_reported_user_id_fkey(id, email, raw_user_meta_data)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching disputes:", error)
      return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 })
    }

    // Format the response to match expected structure
    const formattedDisputes =
      disputes?.map((dispute) => ({
        ...dispute,
        reporter: {
          id: dispute.reporter?.id,
          first_name: dispute.reporter?.raw_user_meta_data?.firstName || "Unknown",
          last_name: dispute.reporter?.raw_user_meta_data?.lastName || "User",
          email: dispute.reporter?.email || "unknown@example.com",
        },
        reported_user: {
          id: dispute.reported_user?.id,
          first_name: dispute.reported_user?.raw_user_meta_data?.firstName || "Unknown",
          last_name: dispute.reported_user?.raw_user_meta_data?.lastName || "User",
          email: dispute.reported_user?.email || "unknown@example.com",
        },
      })) || []

    return NextResponse.json(formattedDisputes)
  } catch (error) {
    console.error("Error in admin disputes API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
