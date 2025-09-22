"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SellerLevelBadge } from "@/components/seller/seller-level-badge"
import { MapPin, Clock, Users, Timer, Lock, Verified, EyeOff, Heart } from "lucide-react"
import type { Job } from "@/lib/jobs"
import { formatDistanceToNow } from "date-fns"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useLocalReservations, useJobReservationStatus } from "@/hooks/use-local-reservations"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useHiddenJobs } from "@/hooks/use-hidden-jobs"
import { useFavorites } from "@/hooks/use-favorites"

interface JobCardProps {
  job: Job
  showApplyButton?: boolean
}

export function JobCard({ job, showApplyButton = true }: JobCardProps) {
  const progress = Math.min(((job.applicationsCount || 0) / (job.workersNeeded || 1)) * 100, 100)
  const { user } = useAuth()
  const router = useRouter()
  const { settings, reserve } = useLocalReservations(user?.id)
  const { status: reservationStatus, refresh: refreshStatus } = useJobReservationStatus(job.id)
  const { hideJob } = useHiddenJobs()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [isReserving, setIsReserving] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isHiding, setIsHiding] = useState(false)
  const [jobAvailability, setJobAvailability] = useState<{ available: boolean; reason?: string; spotsLeft?: number }>({
    available: true,
  })

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

  useEffect(() => {
    console.log("[v0] JobCard reservation debug for job:", job.id, job.title)
    console.log("[v0] User ID:", user?.id)
    console.log("[v0] Reservation settings:", settings)
    console.log("[v0] Reservation status:", reservationStatus)
    console.log("[v0] Show apply button:", showApplyButton)
  }, [job.id, job.title, user?.id, settings, reservationStatus, showApplyButton])

  useEffect(() => {
    if (reservationStatus.isReserved && reservationStatus.timeLeft) {
      const updateTimer = () => {
        const timeLeftMs = reservationStatus.timeLeft || 0

        if (timeLeftMs > 0) {
          const hours = Math.floor(timeLeftMs / (1000 * 60 * 60))
          const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000)
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
        } else {
          setTimeLeft("Expired")
          refreshStatus()
        }
      }

      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    } else {
      setTimeLeft("")
    }
  }, [reservationStatus.isReserved, reservationStatus.timeLeft, refreshStatus])

  const handleReserveJob = async () => {
    console.log("[v0] Reserve job clicked for:", job.id)
    console.log("[v0] Settings enabled:", settings?.isEnabled)
    console.log("[v0] User ID:", user?.id)

    if (!settings?.isEnabled) {
      console.log("[v0] Reservation disabled in settings")
      toast.error("Job reservation is currently disabled")
      return
    }

    if (!user?.id) {
      console.log("[v0] No user ID found")
      toast.error("Please log in to reserve jobs")
      return
    }

    setIsReserving(true)
    try {
      console.log("[v0] Attempting to reserve job with minutes:", settings.defaultReservationMinutes)
      const reservation = await reserve(job.id, settings.defaultReservationMinutes)
      console.log("[v0] Reservation result:", reservation)

      if (reservation) {
        const timeUnit = settings.defaultReservationMinutes >= 60 ? "hour(s)" : "minute(s)"
        const timeValue =
          settings.defaultReservationMinutes >= 60
            ? Math.round(settings.defaultReservationMinutes / 60)
            : settings.defaultReservationMinutes

        toast.success(`Job reserved for ${timeValue} ${timeUnit}!`)
        refreshStatus()
      } else {
        console.log("[v0] Failed to create reservation")
        toast.error("Failed to reserve job")
      }
    } catch (error) {
      console.error("[v0] Reservation error:", error)
      toast.error("Failed to reserve job")
    } finally {
      setIsReserving(false)
    }
  }

  const handleApplyNow = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    console.log("[v0] Apply Now clicked for job:", job.id)

    if (!user?.id) {
      toast.error("Please log in to apply for jobs")
      return
    }

    if (!jobAvailability.available) {
      toast.error(jobAvailability.reason || "This job is not available")
      return
    }

    router.push(`/jobs/${job.id}`)
  }

  const handleCardClick = () => {
    if (!user?.id) {
      toast.error("Please log in to apply for jobs")
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

  const getThumbnailUrl = () => {
    console.log("[v0] JobCard thumbnail debug for job:", job.id, job.title)
    console.log("[v0] Job thumbnail:", job.thumbnail)
    console.log("[v0] Job subcategory:", job.subcategory)
    console.log("[v0] Job category:", job.category)
    console.log("[v0] Job categoryThumbnail:", job.categoryThumbnail)

    if (job.thumbnail) {
      console.log("[v0] Using job thumbnail:", job.thumbnail)
      return job.thumbnail
    }

    if (job.subcategory?.thumbnail) {
      console.log("[v0] Using subcategory thumbnail:", job.subcategory.thumbnail)
      return job.subcategory.thumbnail
    }

    if (job.categoryThumbnail || job.category?.thumbnail) {
      const categoryThumbnail = job.categoryThumbnail || job.category.thumbnail
      console.log("[v0] Using category thumbnail:", categoryThumbnail)
      return categoryThumbnail
    }

    const placeholder = `/placeholder.svg?height=160&width=280&query=${encodeURIComponent(job.category.name + " microjob")}`
    console.log("[v0] Using placeholder:", placeholder)
    return placeholder
  }

  const getLocationDisplay = () => {
    if (job.isRemote) {
      return job.poster?.location || "Bangladesh"
    }
    return job.location
  }

  const thumbnailUrl = getThumbnailUrl()

  return (
    <Card
      className="group bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden w-full cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative">
        <div className="w-full h-32 sm:h-40 bg-gray-100 overflow-hidden">
          <img
            src={thumbnailUrl || "/placeholder.svg"}
            alt={job.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = `/placeholder.svg?height=160&width=280&query=${encodeURIComponent(job.category.name + " job")}`
            }}
          />
        </div>

        <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
          <Badge className="bg-emerald-500 text-white font-medium px-2 sm:px-3 py-1 text-xs rounded-full shadow-lg">
            Microjob
          </Badge>
        </div>

        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            disabled={isTogglingFavorite}
            className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-white transition-colors"
          >
            <Heart
              className={`h-4 w-4 ${jobIsFavorited ? "text-red-500 fill-red-500" : "text-gray-600"} ${isTogglingFavorite ? "animate-pulse" : ""}`}
            />
          </button>
          <button
            onClick={handleHideJob}
            disabled={isHiding}
            className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-white transition-colors"
          >
            <EyeOff className={`h-4 w-4 text-gray-600 ${isHiding ? "animate-pulse" : ""}`} />
          </button>
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 sm:px-2.5 py-1 shadow-md">
            <span className="text-emerald-600 font-bold text-xs sm:text-sm">${job.budgetMax}</span>
          </div>
        </div>

        {reservationStatus.isReserved && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 text-center shadow-lg">
              <Lock className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <div className="text-sm font-semibold text-gray-900">Reserved</div>
              {timeLeft && timeLeft !== "Expired" && (
                <div className="text-xs text-orange-600 font-medium">{timeLeft} left</div>
              )}
              {timeLeft === "Expired" && <div className="text-xs text-red-600 font-medium">Reservation Expired</div>}
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full px-2 py-1"
          >
            {job.category.name}
          </Badge>
          <div className="flex items-center text-gray-500 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">
              {formatDistanceToNow(new Date(job.updatedAt || job.createdAt), { addSuffix: true })}
            </span>
            <span className="sm:hidden">
              {formatDistanceToNow(new Date(job.updatedAt || job.createdAt), { addSuffix: true })
                .replace("about ", "")
                .replace(" ago", "")}
            </span>
          </div>
        </div>

        {job.postedBy && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {job.postedBy.firstName?.[0] || "U"}
                  {job.postedBy.lastName?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-gray-900">{job.postedBy.username || "Anonymous"}</span>
                {job.postedBy.isVerified && <Verified className="h-3 w-3 text-blue-500" />}
              </div>
            </div>
            <SellerLevelBadge sellerId={job.postedBy.id} showName={false} size="sm" />
          </div>
        )}

        <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight line-clamp-2 min-h-[2.5rem] sm:min-h-[3.5rem] group-hover:text-emerald-600 transition-colors">
          {job.title}
        </h3>

        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600">
          <div className="flex items-center">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-emerald-500" />
            <span className="truncate max-w-[100px] sm:max-w-none">{getLocationDisplay()}</span>
          </div>
          <div className="flex items-center">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-emerald-500" />
            <span>{job.workersNeeded} needed</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{job.applicationsCount || 0}</span> of {job.workersNeeded}{" "}
              applied
            </span>
            <div className="flex items-center text-gray-500 font-medium">
              <span>{jobAvailability.spotsLeft || job.workersNeeded - (job.applicationsCount || 0)} spots left</span>
            </div>
          </div>
        </div>

        {showApplyButton && (
          <div className="pt-2 space-y-2">
            {(() => {
              console.log("[v0] Rendering reservation UI - isReserved:", reservationStatus.isReserved)
              console.log("[v0] Settings enabled:", settings?.isEnabled)
              return null
            })()}

            {reservationStatus.isReserved ? (
              <div className="text-center py-3 bg-orange-50 rounded-xl border border-orange-200">
                <div className="text-sm text-orange-700 font-semibold flex items-center justify-center mb-1">
                  <Timer className="h-4 w-4 mr-2" />
                  {timeLeft === "Expired" ? "Reservation Expired" : "You Reserved This Job"}
                </div>
                {timeLeft && timeLeft !== "Expired" && (
                  <div className="text-xs text-orange-600 font-medium">{timeLeft} remaining</div>
                )}
                {timeLeft === "Expired" && (
                  <div className="text-xs text-red-600 font-medium">Apply now or lose this opportunity</div>
                )}
              </div>
            ) : (
              <>
                {!jobAvailability.available ? (
                  <Button
                    disabled
                    className="w-full bg-gray-400 text-white font-semibold py-2.5 sm:py-3 rounded-xl text-sm cursor-not-allowed"
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
                    onClick={handleApplyNow}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 sm:py-3 rounded-xl transition-all duration-200 hover:shadow-lg text-sm"
                  >
                    Apply Now • ${job.budgetMax}
                  </Button>
                )}
                {settings?.isEnabled && jobAvailability.available && (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReserveJob()
                    }}
                    disabled={isReserving}
                    className="w-full border-2 border-orange-400 text-orange-600 hover:bg-orange-50 hover:border-orange-500 font-semibold py-2.5 sm:py-3 rounded-xl transition-all duration-200 text-sm bg-white shadow-sm hover:shadow-md"
                  >
                    {isReserving ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="hidden sm:inline">Reserving Job...</span>
                        <span className="sm:hidden">Reserving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Timer className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">
                          Reserve for{" "}
                          {settings.defaultReservationMinutes >= 60
                            ? `${Math.round(settings.defaultReservationMinutes / 60)} Hour${Math.round(settings.defaultReservationMinutes / 60) > 1 ? "s" : ""}`
                            : `${settings.defaultReservationMinutes} Minutes`}
                        </span>
                        <span className="sm:hidden">Reserve</span>
                      </div>
                    )}
                  </Button>
                )}
                {settings?.isEnabled && jobAvailability.available && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 hidden sm:block">
                      💡 Reserve to hold this job while you decide
                    </p>
                    <p className="text-xs text-gray-500 sm:hidden">💡 Hold job while deciding</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
