import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fullName,
      email,
      phone,
      skills,
      experienceYears,
      education,
      certifications,
      portfolioLinks,
      workSamples,
      platformProfiles,
    } = body

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const userId = user.id

    // Insert the application
    const result = await sql`
      INSERT INTO service_provider_applications (
        user_id,
        full_name,
        email,
        phone,
        skills,
        experience_years,
        education,
        certifications,
        portfolio_links,
        work_samples,
        fiverr_profile,
        upwork_profile,
        peopleperhour_profile,
        legiit_profile,
        requested_categories
      ) VALUES (
        ${userId},
        ${fullName},
        ${email},
        ${phone || null},
        ${skills},
        ${Number.parseInt(experienceYears)},
        ${education || null},
        ${certifications},
        ${portfolioLinks},
        ${workSamples},
        ${platformProfiles.fiverr || null},
        ${platformProfiles.upwork || null},
        ${platformProfiles.peopleperhour || null},
        ${platformProfiles.legiit || null},
        ${[]} -- Will be populated when we add category selection
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      applicationId: result[0].id,
    })
  } catch (error) {
    console.error("Error creating service provider application:", error)
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const userId = user.id

    const applications = await sql`
      SELECT 
        spa.*,
        u.username,
        u.email as user_email
      FROM service_provider_applications spa
      JOIN users u ON spa.user_id = u.id
      WHERE spa.user_id = ${userId}
      ORDER BY spa.created_at DESC
    `

    return NextResponse.json({ applications })
  } catch (error) {
    console.error("Error fetching service provider applications:", error)
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 })
  }
}
