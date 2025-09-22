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

    // Get notification templates
    const { data: templates, error } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("Error fetching notification templates:", error)
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
    }

    return NextResponse.json(templates || [])
  } catch (error) {
    console.error("Error in notification templates API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
