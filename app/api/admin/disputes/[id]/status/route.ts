import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const body = await request.json()
    const { status, adminNotes } = body
    const disputeId = params.id

    // Update dispute status
    const { error: updateError } = await supabase
      .from("disputes")
      .update({
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId)

    if (updateError) {
      console.error("Error updating dispute status:", updateError)
      return NextResponse.json({ error: "Failed to update dispute status" }, { status: 500 })
    }

    // Log the action
    await supabase.from("dispute_actions").insert({
      dispute_id: disputeId,
      admin_id: user.id,
      action_type: "status_change",
      action_details: {
        newStatus: status,
        adminNotes,
      },
    })

    return NextResponse.json({ message: "Status updated successfully" })
  } catch (error) {
    console.error("Error updating dispute status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
