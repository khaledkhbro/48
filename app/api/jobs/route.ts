import { type NextRequest, NextResponse } from "next/server"
import { getJobsFromDatabase } from "@/lib/jobs"
import { getMicrojobAlgorithmSettings, applyMicrojobAlgorithm } from "@/lib/microjob-algorithm"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Jobs API: Starting request processing")

    const { searchParams } = new URL(request.url)

    const limitParam = searchParams.get("limit")
    let validLimit: number | undefined = undefined

    if (limitParam) {
      const parsedLimit = Number(limitParam)
      // Ensure limit is a valid positive integer between 1 and 100
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100 && Number.isInteger(parsedLimit)) {
        validLimit = parsedLimit
      } else {
        console.log("[v0] Jobs API: Invalid limit parameter:", limitParam, "- ignoring")
      }
    }

    const filters = {
      category: searchParams.get("category") || undefined,
      location: searchParams.get("location") || undefined,
      search: searchParams.get("search") || undefined,
      remote: searchParams.get("remote") === "true" ? true : searchParams.get("remote") === "false" ? false : undefined,
      budget:
        searchParams.get("budgetMin") && searchParams.get("budgetMax")
          ? { min: Number(searchParams.get("budgetMin")), max: Number(searchParams.get("budgetMax")) }
          : undefined,
      limit: validLimit, // Use validated limit instead of raw conversion
    }

    console.log("[v0] Jobs API: Fetching jobs from database with filters:", filters)

    let jobs = await getJobsFromDatabase(filters)
    console.log("[v0] Jobs API: Retrieved", jobs.length, "jobs from database")

    let algorithmSettings
    try {
      algorithmSettings = await getMicrojobAlgorithmSettings()
      console.log("[v0] Jobs API: Algorithm settings retrieved:", algorithmSettings)
    } catch (error) {
      console.error("[v0] Jobs API: Error getting algorithm settings:", error)
      // Use default settings if fetch fails
      algorithmSettings = {
        id: 1,
        algorithm_type: "newest_first" as const,
        is_enabled: true,
        rotation_hours: 8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      console.log("[v0] Jobs API: Using default algorithm settings")
    }

    if (algorithmSettings.is_enabled) {
      let rotationData = undefined

      // If using time rotation, get rotation tracking data
      if (algorithmSettings.algorithm_type === "time_rotation") {
        try {
          const { data: rotationResults, error } = await supabase
            .from("microjob_rotation_tracking")
            .select("job_id, last_front_page_at, front_page_duration_minutes, rotation_cycle")
            .order("last_front_page_at", { ascending: true })

          if (error) throw error
          rotationData = rotationResults
        } catch (error) {
          console.error("[v0] Jobs API: Error fetching rotation data:", error)
        }
      }

      // Apply the selected algorithm
      jobs = applyMicrojobAlgorithm(jobs, algorithmSettings, rotationData)

      // Update rotation tracking for time-based algorithm
      if (algorithmSettings.algorithm_type === "time_rotation" && jobs.length > 0) {
        try {
          const now = new Date().toISOString()
          const rotationHours = algorithmSettings.rotation_hours

          // Update tracking for jobs that are now on front page
          for (let i = 0; i < Math.min(jobs.length, 20); i++) {
            // Top 20 jobs considered "front page"
            const job = jobs[i]
            const { error } = await supabase.from("microjob_rotation_tracking").upsert(
              {
                job_id: job.id,
                last_front_page_at: now,
                front_page_duration_minutes: rotationHours * 60,
                rotation_cycle: 1,
                updated_at: now,
              },
              {
                onConflict: "job_id",
                ignoreDuplicates: false,
              },
            )

            if (error) throw error
          }
        } catch (error) {
          console.error("[v0] Jobs API: Error updating rotation tracking:", error)
        }
      }
    }

    console.log("[v0] Jobs API: Successfully processed", jobs.length, "jobs")

    return NextResponse.json({
      jobs,
      algorithm: {
        type: algorithmSettings.algorithm_type,
        enabled: algorithmSettings.is_enabled,
        rotation_hours: algorithmSettings.rotation_hours,
      },
    })
  } catch (error) {
    console.error("[v0] Jobs API: Error fetching jobs:", error)
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
  }
}
