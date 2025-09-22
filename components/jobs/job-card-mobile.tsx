"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, EyeOff, Heart } from "lucide-react"
import type { Job } from "@/lib/jobs"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useHiddenJobs } from "@/hooks/use-hidden-jobs"
import { useFavorites } from "@/hooks/use-favorites"
import { toast } from "sonner"

interface JobCardMobileProps {
  job: Job
}

export function JobCardMobile({ job }: JobCardMobileProps) {
  const progress = Math.min(((job.applicationsCount || 0) / (job.workersNeeded || 1)) * 100, 100)
  const { user } = useAuth()
  const router = useRouter()
  const { hideJob } = useHiddenJobs()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [jobAvailability, setJobAvailability] = useState<{ available: boolean; reason?: string; spotsLeft?: number }>({
    available: true,
  })
  const [isHiding, setIsHiding] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)

  const jobIsFavorited = isFavorite(job.id)

  useEffect(() => {
    const checkAvailability = () => {
      if (user?.id && job.userId === user.id) {
        setJobAvailability({ available: false, reason: "Cannot apply to your own job" })
        return
      }

      const spotsLeft = (job.workersNeeded || 1) - (job.applicationsCount || 0)
      if (spotsLeft <= 0) {
        setJobAvailability({ available: false, reason: "Job is no longer accepting applications" })
        return
      }

      setJobAvailability({
        available: true,
        spotsLeft: spotsLeft,
      })
    }

    checkAvailability()
  }, [job.id, job.userId, job.workersNeeded, job.applicationsCount, user?.id])

  const handleCardClick = () => {
    if (!user?.id) {
      return
    }
    router.push(`/jobs/${job.id}`)
  }

  const handleHideJob = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user?.id) {
      toast.error("Please log in to hide jobs")
      return
    }

    setIsHiding(true)
    try {
      const success = await hideJob(job.id, "Not interested")
      if (success) {
        // Job will be filtered out on next page refresh/load
      }
    } catch (error) {
      console.error("Error hiding job:", error)
    } finally {
      setIsHiding(false)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user?.id) {
      toast.error("Please log in to save favorites")
      return
    }

    setIsTogglingFavorite(true)
    try {
      await toggleFavorite(job.id)
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  const getPlatformIcon = () => {
    const title = job.title.toLowerCase()
    const category = job.category.name.toLowerCase()

    if (title.includes("instagram") || title.includes("insta")) {
      return "/instagram-logo.png"
    }
    if (title.includes("youtube") || title.includes("yt")) {
      return "/youtube-logo.png"
    }
    if (title.includes("facebook") || title.includes("fb")) {
      return "/facebook-logo.png"
    }
    if (title.includes("twitter") || title.includes("x.com")) {
      return "/twitter-logo.png"
    }
    if (title.includes("tiktok")) {
      return "/tiktok-logo.png"
    }
    if (title.includes("linkedin")) {
      return "/linkedin-logo.png"
    }

    return `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(category + " icon")}`
  }

  const getLocationDisplay = () => {
    if (job.isRemote) {
      return job.poster?.location || "Bangladesh"
    }
    return job.location
  }

  return (
    <Card
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden mb-2 cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={getPlatformIcon() || "/placeholder.svg"}
                alt={job.category.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(job.category.name + " icon")}`
                }}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Badge className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full mb-1">Microjob</Badge>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                  {job.category.name}/{job.subcategory?.name || "General"}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{job.title}</h3>

                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="mr-3">{getLocationDisplay()}</span>
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    {formatDistanceToNow(new Date(job.updatedAt || job.createdAt), { addSuffix: true })
                      .replace("about ", "")
                      .replace(" ago", "")}
                  </span>
                </div>
              </div>

              <div className="text-right ml-2 flex flex-col items-end gap-2">
                <div className="text-emerald-600 font-bold text-lg">${job.budgetMax}</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleToggleFavorite}
                    disabled={isTogglingFavorite}
                    className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Heart
                      className={`h-3 w-3 ${jobIsFavorited ? "text-red-500 fill-red-500" : "text-gray-600"} ${isTogglingFavorite ? "animate-pulse" : ""}`}
                    />
                  </button>
                  <button
                    onClick={handleHideJob}
                    disabled={isHiding}
                    className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <EyeOff className={`h-3 w-3 text-gray-600 ${isHiding ? "animate-pulse" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-600">
                  <span className="font-medium text-gray-900">{job.applicationsCount || 0}</span> of {job.workersNeeded}
                </span>
                <div className="flex items-center text-gray-500 text-xs">
                  <span className="font-medium">
                    {jobAvailability.spotsLeft || job.workersNeeded - (job.applicationsCount || 0)} spots left
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!jobAvailability.available ? (
          <Button
            disabled
            className="w-full bg-gray-400 text-white font-semibold py-2 rounded-lg text-sm transition-all duration-200 mt-2 cursor-not-allowed"
          >
            {jobAvailability.reason === "Cannot apply to your own job"
              ? "Your Job"
              : jobAvailability.reason === "Job is no longer accepting applications"
                ? "Job Full"
                : jobAvailability.reason === "You have already applied to this job"
                  ? "Applied"
                  : "Unavailable"}
          </Button>
        ) : (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick()
            }}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 rounded-lg text-sm transition-all duration-200 mt-2"
          >
            Apply Now
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
