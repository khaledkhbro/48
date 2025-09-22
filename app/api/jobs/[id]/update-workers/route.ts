import { type NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] 👥 Update workers API: Starting request for job:", params.id)

    const user = await getUser()
    if (!user) {
      console.log("[v0] 👥 Update workers API: No user authenticated")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { newWorkerCount } = body
    const jobId = params.id

    console.log("[v0] 👥 Update workers API: Request data:", { jobId, newWorkerCount, userId: user.id })

    if (!newWorkerCount || newWorkerCount < 1) {
      console.log("[v0] 👥 Update workers API: Invalid worker count:", newWorkerCount)
      return NextResponse.json({ error: "Invalid worker count" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      console.error("[v0] 👥 Update workers API: DATABASE_URL not configured")
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const jobResult = await sql`
      SELECT 
        j.*,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id AND status = 'accepted') as accepted_count
      FROM microjobs j 
      WHERE j.id = ${jobId} AND j.user_id = ${user.id}
    `

    console.log("[v0] 👥 Update workers API: Job query result:", jobResult.length)

    if (jobResult.length === 0) {
      console.log("[v0] 👥 Update workers API: Job not found or no permission")
      return NextResponse.json({ error: "Job not found or you don't have permission" }, { status: 404 })
    }

    const job = jobResult[0]
    const currentWorkerCount = job.workers_needed || 1
    const acceptedCount = Number.parseInt(job.accepted_count) || 0

    console.log("[v0] 👥 Update workers API: Current state:", { currentWorkerCount, acceptedCount, newWorkerCount })

    if (newWorkerCount < acceptedCount) {
      console.log("[v0] 👥 Update workers API: Cannot reduce below accepted count")
      return NextResponse.json(
        {
          error: `Cannot reduce worker count below ${acceptedCount} (current accepted applications)`,
        },
        { status: 400 },
      )
    }

    await sql`
      UPDATE microjobs 
      SET 
        workers_needed = ${newWorkerCount},
        updated_at = NOW()
      WHERE id = ${jobId}
    `

    console.log("[v0] 👥 Update workers API: Updated worker count successfully")

    if (newWorkerCount > currentWorkerCount && acceptedCount >= currentWorkerCount) {
      await sql`
        UPDATE microjobs 
        SET status = 'open'
        WHERE id = ${jobId} AND status = 'completed'
      `
      console.log("[v0] 👥 Update workers API: Reopened job due to increased worker count")
    }

    const response = {
      success: true,
      message: `Worker count updated to ${newWorkerCount}`,
      previousCount: currentWorkerCount,
      newCount: newWorkerCount,
      acceptedApplications: acceptedCount,
    }

    console.log("[v0] 👥 Update workers API: Success response:", response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] 👥 Update workers API: Error:", error)
    return NextResponse.json({ error: "Failed to update worker count" }, { status: 500 })
  }
}
