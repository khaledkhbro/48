import { sql } from "@/lib/db"

export async function updateJobVisibility(jobId: string) {
  try {
    const jobResult = await sql`
      SELECT 
        j.workers_needed,
        j.status,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id AND status = 'accepted') as accepted_count,
        (SELECT COUNT(*) FROM work_proofs WHERE job_id = j.id AND status = 'approved') as completed_count
      FROM microjobs j 
      WHERE j.id = ${jobId}
    `

    if (jobResult.length === 0) return

    const job = jobResult[0]
    const workersNeeded = job.workers_needed || 1
    const acceptedCount = Number.parseInt(job.accepted_count) || 0
    const completedCount = Number.parseInt(job.completed_count) || 0

    let newStatus = job.status

    if (acceptedCount >= workersNeeded && completedCount >= workersNeeded) {
      newStatus = "completed"
    } else if (acceptedCount >= workersNeeded) {
      newStatus = "in_progress"
    } else {
      newStatus = "open"
    }

    if (newStatus !== job.status) {
      await sql`
        UPDATE microjobs 
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${jobId}
      `
    }

    return { success: true, newStatus, acceptedCount, workersNeeded }
  } catch (error) {
    console.error("Error updating job visibility:", error)
    return { success: false, error }
  }
}

export async function checkJobAvailability(jobId: string, userId?: string) {
  try {
    const jobResult = await sql`
      SELECT 
        j.*,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id AND status = 'accepted') as accepted_count
      FROM microjobs j 
      WHERE j.id = ${jobId}
    `

    if (jobResult.length === 0) {
      return { available: false, reason: "Job not found" }
    }

    const job = jobResult[0]
    const workersNeeded = job.workers_needed || 1
    const acceptedCount = Number.parseInt(job.accepted_count) || 0

    if (userId && job.user_id === userId) {
      return { available: false, reason: "Cannot apply to your own job" }
    }

    if (acceptedCount >= workersNeeded) {
      return { available: false, reason: "Job is no longer accepting applications" }
    }

    if (userId) {
      const existingApplication = await sql`
        SELECT id FROM job_applications 
        WHERE job_id = ${jobId} AND applicant_id = ${userId}
      `

      if (existingApplication.length > 0) {
        return { available: false, reason: "You have already applied to this job" }
      }
    }

    return {
      available: true,
      workersNeeded,
      acceptedCount,
      spotsLeft: workersNeeded - acceptedCount,
    }
  } catch (error) {
    console.error("Error checking job availability:", error)
    return { available: false, reason: "Error checking availability" }
  }
}
