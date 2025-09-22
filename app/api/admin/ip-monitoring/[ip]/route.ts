import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest, { params }: { params: { ip: string } }) {
  try {
    const ipAddress = decodeURIComponent(params.ip)

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    })

    // Get detailed user information for the IP address
    const { data: users, error } = await supabase.rpc("get_ip_user_details", { target_ip: ipAddress })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch IP user details" }, { status: 500 })
    }

    return NextResponse.json({
      users: users || [],
      ip_address: ipAddress,
      count: users?.length || 0,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
