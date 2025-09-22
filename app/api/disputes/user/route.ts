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

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get disputes where user is either reporter or reported user
    const { data: disputes, error } = await supabase
      .from("disputes")
      .select(`
        *,
        job:jobs(id, title),
        reporter:reporter_id(id, first_name, last_name),
        reported_user:reported_user_id(id, first_name, last_name)
      `)
      .or(`reporter_id.eq.${user.id},reported_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user disputes:", error)
      return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 })
    }

    return NextResponse.json(disputes || [])
  } catch (error) {
    console.error("Error in user disputes API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
