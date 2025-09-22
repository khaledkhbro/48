import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    })

    console.log("[v0] Fetching suspicious IP addresses...")

    const { data: tableExists, error: tableError } = await supabase.from("user_login_logs").select("id").limit(1)

    if (tableError) {
      console.log("[v0] user_login_logs table doesn't exist, returning empty result")
      return NextResponse.json({
        suspiciousIPs: [],
        count: 0,
        message:
          "IP monitoring requires the user login tracking system to be set up. Please run the database migration scripts.",
      })
    }

    // Get suspicious IP addresses (IPs with multiple users)
    const { data: suspiciousIPs, error } = await supabase
      .from("suspicious_ip_addresses")
      .select("*")
      .order("user_count", { ascending: false })

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({
        suspiciousIPs: [],
        count: 0,
        message: "No suspicious IP data available. The monitoring system may need to be initialized.",
      })
    }

    console.log("[v0] Successfully fetched", suspiciousIPs?.length || 0, "suspicious IPs")

    return NextResponse.json({
      suspiciousIPs: suspiciousIPs || [],
      count: suspiciousIPs?.length || 0,
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({
      suspiciousIPs: [],
      count: 0,
      message: "Unable to load IP monitoring data at this time.",
    })
  }
}
