import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    if (!userId) {
      // Return general marketplace content for anonymous users
      const services = await sql`
        SELECT ms.*, mc.name as category_name, msc.name as subcategory_name
        FROM marketplace_services ms
        LEFT JOIN marketplace_categories mc ON ms.category_id = mc.id
        LEFT JOIN marketplace_subcategories msc ON ms.subcategory_id = msc.id
        WHERE ms.is_active = true
        ORDER BY ms.view_count DESC, ms.order_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      return NextResponse.json({
        services,
        personalized: false,
        reason: "Anonymous user - showing popular services",
      })
    }

    // Get personalized services using the database function
    const personalizedServices = await sql`
      SELECT * FROM get_personalized_services(${Number.parseInt(userId)}, ${limit}, ${offset})
    `

    // Get full service details
    const serviceIds = personalizedServices.map((ps) => ps.service_id)

    if (serviceIds.length === 0) {
      return NextResponse.json({
        services: [],
        personalized: false,
        reason: "No personalized services available",
      })
    }

    const services = await sql`
      SELECT ms.*, mc.name as category_name, msc.name as subcategory_name
      FROM marketplace_services ms
      LEFT JOIN marketplace_categories mc ON ms.category_id = mc.id  
      LEFT JOIN marketplace_subcategories msc ON ms.subcategory_id = msc.id
      WHERE ms.id = ANY(${serviceIds})
      ORDER BY array_position(${serviceIds}, ms.id)
    `

    // Combine service data with personalization scores
    const enrichedServices = services.map((service) => {
      const personalizationData = personalizedServices.find((ps) => ps.service_id === service.id)
      return {
        ...service,
        personalization_score: personalizationData?.personalization_score || 0,
        personalization_reason: personalizationData?.reason || "General recommendation",
      }
    })

    return NextResponse.json({
      services: enrichedServices,
      personalized: true,
      reason: "Personalized based on your interests and search behavior",
    })
  } catch (error) {
    console.error("Error fetching personalized marketplace:", error)
    return NextResponse.json({ error: "Failed to fetch personalized content" }, { status: 500 })
  }
}

// Track user search behavior
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      sessionId,
      searchQuery,
      searchType,
      categoryId,
      subcategoryId,
      microCategoryId,
      resultsCount,
      clickedServiceId,
      timeSpentSeconds,
    } = await request.json()

    // Record search behavior
    await sql`
      INSERT INTO user_search_behavior (
        user_id, session_id, search_query, search_type,
        category_id, subcategory_id, micro_category_id,
        results_count, clicked_service_id, time_spent_seconds,
        ip_address, user_agent
      ) VALUES (
        ${userId}, ${sessionId}, ${searchQuery}, ${searchType},
        ${categoryId}, ${subcategoryId}, ${microCategoryId},
        ${resultsCount}, ${clickedServiceId}, ${timeSpentSeconds},
        ${request.ip}, ${request.headers.get("user-agent")}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking search behavior:", error)
    return NextResponse.json({ error: "Failed to track behavior" }, { status: 500 })
  }
}
