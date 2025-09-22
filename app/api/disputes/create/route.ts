import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { jobId, reportedUserId, disputeType, title, description, evidence } = body

    // Validate required fields
    if (!jobId || !reportedUserId || !disputeType || !title || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the job belongs to the current user (reporter)
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, user_id, title")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: "You can only report disputes for your own jobs" }, { status: 403 })
    }

    // Create the dispute record
    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert({
        job_id: jobId,
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        dispute_type: disputeType,
        title,
        description,
        evidence_urls: evidence ? [evidence] : [],
        status: "pending",
      })
      .select()
      .single()

    if (disputeError) {
      console.error("Error creating dispute:", disputeError)
      return NextResponse.json({ error: "Failed to create dispute" }, { status: 500 })
    }

    // Send notification to admin (you can implement this based on your notification system)
    try {
      // Add admin notification logic here
      console.log("New dispute created:", dispute.id, "- Admin notification should be sent")
    } catch (notificationError) {
      console.error("Failed to send admin notification:", notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      message: "Report submitted successfully. Admin will review this case within 24-48 hours.",
      disputeId: dispute.id,
    })
  } catch (error) {
    console.error("Error in dispute creation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
