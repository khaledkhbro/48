import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { status, admin_notes, additional_info_requested } = body
    const applicationId = params.id

    // Update the application
    await sql`
      UPDATE service_provider_applications 
      SET 
        status = ${status},
        admin_notes = ${admin_notes || null},
        additional_info_requested = ${additional_info_requested || null},
        reviewed_by = ${"admin"}, -- Replace with actual admin ID
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${applicationId}
    `

    // If approved, update the user's service provider status
    if (status === "approved") {
      const application = await sql`
        SELECT user_id FROM service_provider_applications 
        WHERE id = ${applicationId}
      `

      if (application.length > 0) {
        await sql`
          UPDATE users 
          SET 
            is_service_provider = TRUE,
            service_provider_approved_at = NOW()
          WHERE id = ${application[0].user_id}
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating service provider application:", error)
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 })
  }
}
