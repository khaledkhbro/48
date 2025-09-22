import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { userId, ipAddress, locationData, userAgent, loginMethod } = await request.json()

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    })

    // Log the user login
    const { error } = await supabase.rpc("log_user_login", {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_location_data: locationData,
      p_user_agent: userAgent,
      p_login_method: loginMethod || "password",
      p_success: true,
    })

    if (error) {
      console.error("Failed to log user login:", error)
      return NextResponse.json({ error: "Failed to log login" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login logging error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
