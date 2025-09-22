import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let query = sql`
      SELECT 
        spa.*,
        u.username,
        u.email as user_email
      FROM service_provider_applications spa
      JOIN users u ON spa.user_id = u.id
    `

    if (status && status !== "all") {
      query = sql`
        SELECT 
          spa.*,
          u.username,
          u.email as user_email
        FROM service_provider_applications spa
        JOIN users u ON spa.user_id = u.id
        WHERE spa.status = ${status}
      `
    }

    query = sql`${query} ORDER BY spa.created_at DESC`

    const applications = await query

    return NextResponse.json({ applications })
  } catch (error) {
    console.error("Error fetching service provider applications:", error)
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 })
  }
}
