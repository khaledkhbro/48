import { type NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, coverLetter, proposedBudget, estimatedDuration, portfolioLinks } = body

    if (!jobId || !coverLetter || !proposedBudget) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const jobResult = await sql`
      SELECT 
        j.*,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id AND status = 'accepted') as accepted_count
      FROM microjobs j 
      WHERE j.id = ${jobId}
    `

    if (jobResult.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const job = jobResult[0]

    if (job.user_id === user.id) {
      return NextResponse.json({ error: "You cannot apply to your own job" }, { status: 400 })
    }

    const workersNeeded = job.workers_needed || 1
    const acceptedCount = Number.parseInt(job.accepted_count) || 0

    if (acceptedCount >= workersNeeded) {
      return NextResponse.json({ error: "This job is no longer accepting applications" }, { status: 400 })
    }

    const existingApplication = await sql`
      SELECT id FROM job_applications 
      WHERE job_id = ${jobId} AND applicant_id = ${user.id}
    `

    if (existingApplication.length > 0) {
      return NextResponse.json({ error: "You have already applied to this job" }, { status: 400 })
    }

    const applicationResult = await sql`
      INSERT INTO job_applications (
        job_id,
        applicant_id,
        cover_letter,
        proposed_budget,
        estimated_duration,
        portfolio_links,
        status,
        created_at
      ) VALUES (
        ${jobId},
        ${user.id},
        ${coverLetter},
        ${proposedBudget},
        ${estimatedDuration},
        ${portfolioLinks || []},
        'pending',
        NOW()
      )
      RETURNING id
    `

    await sql`
      UPDATE microjobs 
      SET applications_count = applications_count + 1,
          updated_at = NOW()
      WHERE id = ${jobId}
    `

    return NextResponse.json({
      success: true,
      applicationId: applicationResult[0].id,
      message: "Application submitted successfully",
    })
  } catch (error) {
    console.error("Error submitting job application:", error)
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 })
  }
}
