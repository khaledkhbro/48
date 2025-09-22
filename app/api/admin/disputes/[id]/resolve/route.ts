import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
    const {
      resolution,
      resolutionNotes,
      refundAmount = 0,
      penaltyAmount = 0,
      suspendUser = false,
      suspensionDays = null,
      suspensionReason = null,
    } = body

    const disputeId = params.id

    // Get dispute details
    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .single()

    if (disputeError || !dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 })
    }

    // Update dispute status
    const status =
      resolution === "favor_poster"
        ? "resolved_favor_poster"
        : resolution === "favor_worker"
          ? "resolved_favor_worker"
          : "dismissed"

    const { error: updateError } = await supabase
      .from("disputes")
      .update({
        status,
        resolution_notes: resolutionNotes,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        refund_amount: refundAmount,
        penalty_amount: penaltyAmount,
      })
      .eq("id", disputeId)

    if (updateError) {
      console.error("Error updating dispute:", updateError)
      return NextResponse.json({ error: "Failed to update dispute" }, { status: 500 })
    }

    // Log the action
    await supabase.from("dispute_actions").insert({
      dispute_id: disputeId,
      admin_id: user.id,
      action_type: "resolution",
      action_details: {
        resolution,
        resolutionNotes,
        refundAmount,
        penaltyAmount,
        suspendUser,
        suspensionDays,
        suspensionReason,
      },
    })

    // Handle user suspension if requested
    if (suspendUser && suspensionDays) {
      const suspendedUntil = new Date()
      suspendedUntil.setDate(suspendedUntil.getDate() + suspensionDays)

      await supabase.from("user_suspensions").insert({
        user_id: dispute.reported_user_id,
        suspended_by: user.id,
        dispute_id: disputeId,
        reason: suspensionReason || `Dispute resolution: ${resolution}`,
        suspension_type: "temporary",
        suspended_until: suspendedUntil.toISOString(),
        is_active: true,
      })
    }

    // Process refunds/payments based on resolution
    if (refundAmount > 0) {
      // In a real implementation, you would integrate with your payment processor here
      console.log(`Processing refund of $${refundAmount} for dispute ${disputeId}`)
    }

    if (penaltyAmount > 0) {
      // In a real implementation, you would process penalty charges here
      console.log(`Processing penalty of $${penaltyAmount} for dispute ${disputeId}`)
    }

    let message = "Dispute resolved successfully"
    if (resolution === "favor_poster") {
      message = "Dispute resolved in favor of the employer"
    } else if (resolution === "favor_worker") {
      message = "Dispute resolved in favor of the worker"
    } else {
      message = "Dispute dismissed"
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("Error resolving dispute:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
