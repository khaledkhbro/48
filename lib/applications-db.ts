import { createClient } from "./supabase-client"

export interface JobApplication {
  id: string
  job_id: string
  worker_id: string
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
  cover_letter?: string
  proposed_price?: number
  estimated_duration?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  accepted_at?: string
  completed_at?: string
  cancelled_at?: string
  rejected_at?: string
}

const supabase = createClient()

export async function getApplicationsByUser(userId: string): Promise<JobApplication[]> {
  try {
    const { data, error } = await supabase
      .from("marketplace_applications")
      .select("*")
      .eq("worker_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user applications:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getApplicationsByUser:", error)
    return []
  }
}

export async function getApplicationById(applicationId: string): Promise<JobApplication | null> {
  try {
    const { data, error } = await supabase.from("marketplace_applications").select("*").eq("id", applicationId).single()

    if (error) {
      console.error("Error fetching application:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getApplicationById:", error)
    return null
  }
}

export async function createJobApplication(application: {
  job_id: string
  worker_id: string
  cover_letter?: string
  proposed_price?: number
  estimated_duration?: string
}): Promise<JobApplication | null> {
  try {
    const { data, error } = await supabase.from("marketplace_applications").insert([application]).select().single()

    if (error) {
      console.error("Error creating application:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in createJobApplication:", error)
    return null
  }
}

export async function updateApplicationStatus(
  applicationId: string,
  status: JobApplication["status"],
  additionalData?: {
    rejection_reason?: string
  },
): Promise<boolean> {
  try {
    const updates: any = {
      status,
      [`${status}_at`]: new Date().toISOString(),
    }

    if (additionalData?.rejection_reason) {
      updates.rejection_reason = additionalData.rejection_reason
    }

    const { error } = await supabase.from("marketplace_applications").update(updates).eq("id", applicationId)

    if (error) {
      console.error("Error updating application status:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateApplicationStatus:", error)
    return false
  }
}

export async function getApplicationsByJob(jobId: string): Promise<JobApplication[]> {
  try {
    const { data, error } = await supabase
      .from("marketplace_applications")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching job applications:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getApplicationsByJob:", error)
    return []
  }
}

export async function deleteApplication(applicationId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("marketplace_applications").delete().eq("id", applicationId)

    if (error) {
      console.error("Error deleting application:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteApplication:", error)
    return false
  }
}
