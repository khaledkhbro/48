import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
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

    // Get user's hidden jobs
    const { data: hiddenJobs, error } = await supabase
      .from("hidden_jobs")
      .select("job_id, hidden_at, reason")
      .eq("user_id", user.id)
      .order("hidden_at", { ascending: false })

    if (error) {
      console.error("Error fetching hidden jobs:", error)
      return NextResponse.json({ error: "Failed to fetch hidden jobs" }, { status: 500 })
    }

    return NextResponse.json(hiddenJobs || [])
  } catch (error) {
    console.error("Hidden jobs API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
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

    const { jobId, reason } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    // Check if job exists
    const { data: job, error: jobError } = await supabase.from("jobs").select("id").eq("id", jobId).single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Hide the job
    const { data, error } = await supabase
      .from("hidden_jobs")
      .insert({
        user_id: user.id,
        job_id: jobId,
        reason: reason || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json({ error: "Job is already hidden" }, { status: 409 })
      }
      console.error("Error hiding job:", error)
      return NextResponse.json({ error: "Failed to hide job" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Hide job API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
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

    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    // Unhide the job
    const { error } = await supabase.from("hidden_jobs").delete().eq("user_id", user.id).eq("job_id", jobId)

    if (error) {
      console.error("Error unhiding job:", error)
      return NextResponse.json({ error: "Failed to unhide job" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unhide job API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
