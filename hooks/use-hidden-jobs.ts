"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

export function useHiddenJobs() {
  const { user } = useAuth()
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  // Load hidden jobs on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadHiddenJobs()
    } else {
      setHiddenJobIds(new Set())
      setIsLoading(false)
    }
  }, [user?.id])

  const loadHiddenJobs = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/hidden-jobs")

      if (!response.ok) {
        throw new Error("Failed to fetch hidden jobs")
      }

      const hiddenJobs: { job_id: string }[] = await response.json()

      // Create a Set of job IDs for quick lookup
      const jobIds = new Set(hiddenJobs.map((hidden) => hidden.job_id))
      setHiddenJobIds(jobIds)
    } catch (error) {
      console.error("Error loading hidden jobs:", error)
      // Don't show error toast for hidden jobs as it's not critical
    } finally {
      setIsLoading(false)
    }
  }

  const hideJob = async (jobId: string, reason?: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error("Please log in to hide jobs")
      return false
    }

    try {
      const response = await fetch("/api/hidden-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId, reason }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to hide job")
      }

      // Update local state
      setHiddenJobIds((prev) => new Set([...prev, jobId]))

      toast.success("Job hidden successfully")
      return true
    } catch (error) {
      console.error("Error hiding job:", error)
      toast.error("Failed to hide job")
      return false
    }
  }

  const unhideJob = async (jobId: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error("Please log in to manage hidden jobs")
      return false
    }

    try {
      const response = await fetch("/api/hidden-jobs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to unhide job")
      }

      // Update local state
      setHiddenJobIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })

      toast.success("Job unhidden successfully")
      return true
    } catch (error) {
      console.error("Error unhiding job:", error)
      toast.error("Failed to unhide job")
      return false
    }
  }

  const isHidden = (jobId: string): boolean => {
    return hiddenJobIds.has(jobId)
  }

  return {
    hiddenJobIds,
    isLoading,
    isHidden,
    hideJob,
    unhideJob,
    refreshHiddenJobs: loadHiddenJobs,
  }
}
