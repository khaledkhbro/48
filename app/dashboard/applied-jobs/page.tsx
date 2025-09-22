"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Clock,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Info,
  Timer,
  CheckCircle,
  Eye,
  TrendingUp,
  Target,
  Wallet,
  Flag,
} from "lucide-react"
import { toast } from "sonner"
import { getUserApplications, getJobById, type Job } from "@/lib/jobs"
import { getWorkProofsByJob, type WorkProof } from "@/lib/work-proofs"
import { acceptRejection, createDispute } from "@/lib/work-proofs"
import { getRevisionSettingsFromAPI, type RevisionSettings } from "@/lib/admin-settings"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { getApplicationsByUser } from "@/lib/applications"

interface JobApplication {
  id: string
  jobId: string
  applicantId: string // Changed from workerId to applicantId
  coverLetter: string
  proposedBudget: number
  estimatedDuration: string
  portfolioLinks: string[]
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
  createdAt: string
  appliedAt?: string
  job?: Job | null
  applicant?: {
    id: string
    firstName: string
    lastName: string
    username: string
    rating: number
    totalReviews: number
    skills: string[]
  }
}

interface WorkProofSubmission {
  title: string
  description: string
  screenshots: File[]
  proofLinks: string[]
  additionalNotes: string
}

interface JobStats {
  totalApplied: number
  totalRejected: number
  totalPending: number
  totalAccepted: number
  upcomingMoney: number
  totalEarnings: number
}

const AppliedJobsPage = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobs, setJobs] = useState<{ [key: string]: Job }>({})
  const [workProofs, setWorkProofs] = useState<{ [key: string]: WorkProof[] }>({})
  const [disputes, setDisputes] = useState<{ [key: string]: any }>({}) // Added disputes state
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [submittingProof, setSubmittingProof] = useState(false)
  const [disputeModalOpen, setDisputeModalOpen] = useState(false)
  const [disputeSubmission, setDisputeSubmission] = useState({
    reason: "",
    requestedAction: "payment" as const,
  })

  const [rejectionResponseModalOpen, setRejectionResponseModalOpen] = useState(false)
  const [selectedRejectedProof, setSelectedRejectedProof] = useState<WorkProof | null>(null)
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false)
  const [selectedRevisionProof, setSelectedRevisionProof] = useState<WorkProof | null>(null)
  const [revisionSettings, setRevisionSettings] = useState<RevisionSettings | null>(null)
  const [viewSubmissionModalOpen, setViewSubmissionModalOpen] = useState(false)
  const [selectedWorkProof, setSelectedWorkProof] = useState<WorkProof | null>(null)
  const [viewApplicationModalOpen, setViewApplicationModalOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)

  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({})

  const [jobStats, setJobStats] = useState<JobStats>({
    totalApplied: 0,
    totalRejected: 0,
    totalPending: 0,
    totalAccepted: 0,
    upcomingMoney: 0,
    totalEarnings: 0,
  })
  const [timeFilter, setTimeFilter] = useState("all") // all, today, week, month, year, last_year, custom

  const fetchDisputes = async () => {
    try {
      const response = await fetch("/api/disputes/user")
      if (response.ok) {
        const disputesData = await response.json()
        const disputesMap: { [key: string]: any } = {}
        disputesData.forEach((dispute: any) => {
          disputesMap[dispute.job_id] = dispute
        })
        setDisputes(disputesMap)
      }
    } catch (error) {
      console.error("Error fetching disputes:", error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        const [applicationsData, revisionSettingsData] = await Promise.all([
          getApplicationsByUser(user.id),
          getRevisionSettingsFromAPI(),
        ])

        setApplications(applicationsData)
        setRevisionSettings(revisionSettingsData)

        // Fetch jobs and work proofs for each application
        const jobIds = [...new Set(applicationsData.map((app) => app.jobId))]
        const jobsData: { [key: string]: Job } = {}
        const workProofsData: { [key: string]: WorkProof[] } = {}

        await Promise.all(
          jobIds.map(async (jobId) => {
            try {
              const [job, proofs] = await Promise.all([getJobById(jobId), getWorkProofsByJob(jobId)])
              if (job) jobsData[jobId] = job
              workProofsData[jobId] = proofs || []
            } catch (error) {
              console.error(`Error fetching data for job ${jobId}:`, error)
            }
          }),
        )

        setJobs(jobsData)
        setWorkProofs(workProofsData)

        await fetchDisputes()
      } catch (error) {
        console.error("Error fetching applications:", error)
        toast.error("Failed to load applications")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const calculateJobStats = (applications: JobApplication[], timeFilter: string): JobStats => {
    const now = new Date()
    let filteredApplications = applications

    // Filter applications based on time period
    if (timeFilter !== "all") {
      filteredApplications = applications.filter((app) => {
        const appDate = new Date(app.createdAt)

        switch (timeFilter) {
          case "today":
            return appDate.toDateString() === now.toDateString()
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return appDate >= weekAgo
          case "month":
            return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear()
          case "year":
            return appDate.getFullYear() === now.getFullYear()
          case "last_year":
            return appDate.getFullYear() === now.getFullYear() - 1
          default:
            return true
        }
      })
    }

    const totalApplied = filteredApplications.length
    const totalRejected = filteredApplications.filter((app) => app.status === "rejected").length
    const totalPending = filteredApplications.filter((app) => app.status === "pending").length
    const totalAccepted = filteredApplications.filter((app) => app.status === "accepted").length

    // Calculate upcoming money from pending applications
    const upcomingMoney = filteredApplications
      .filter((app) => app.status === "pending")
      .reduce((sum, app) => sum + (app.proposedBudget || 0), 0)

    // Calculate total earnings from completed/accepted jobs
    const totalEarnings = filteredApplications
      .filter((app) => app.status === "accepted" || app.status === "completed")
      .reduce((sum, app) => sum + (app.proposedBudget || 0), 0)

    return {
      totalApplied,
      totalRejected,
      totalPending,
      totalAccepted,
      upcomingMoney,
      totalEarnings,
    }
  }

  const calculateCountdown = (deadline: string, proofStatus?: string): string => {
    // If job is already auto-processed, don't show countdown
    if (proofStatus === "cancelled_by_worker" || proofStatus === "rejected_accepted") {
      return "AUTO_PROCESSED"
    }

    const now = new Date().getTime()
    const deadlineTime = new Date(deadline).getTime()
    const timeLeft = deadlineTime - now

    if (timeLeft <= 0) {
      return "EXPIRED"
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s left`
    } else {
      return `${seconds}s left`
    }
  }

  const processExpiredTimeout = async (proofId: string, proofStatus: string) => {
    try {
      console.log("[v0] Processing expired timeout for proof:", proofId, "status:", proofStatus)

      const response = await fetch("/api/test-cron", {
        method: "GET",
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Timeout processing completed:", result)

        // Show success message based on the type of timeout
        if (proofStatus === "rejected") {
          toast.success("Rejection timeout expired - Refund processed automatically!")
        } else if (proofStatus === "revision_requested") {
          toast.success("Revision timeout expired - Job cancelled and refunded automatically!")
        }

        // Refresh the applications data to show updated status
        await refreshApplications()
      } else {
        console.error("[v0] Failed to process timeout:", response.status)
        toast.error("Failed to process expired timeout. Please refresh the page.")
      }
    } catch (error) {
      console.error("[v0] Error processing expired timeout:", error)
      toast.error("Failed to process expired timeout. Please refresh the page.")
    }
  }

  const updateCountdowns = () => {
    const newCountdowns: { [key: string]: string } = {}
    const expiredProofs: { proofId: string; status: string }[] = []

    Object.values(workProofs)
      .flat()
      .forEach((proof) => {
        if (proof.status === "rejected" && proof.rejectionDeadline) {
          const countdown = calculateCountdown(proof.rejectionDeadline, proof.status)
          newCountdowns[proof.id] = countdown

          if (countdown === "EXPIRED" && countdowns[proof.id] !== "EXPIRED") {
            expiredProofs.push({ proofId: proof.id, status: proof.status })
          }
        } else if (proof.status === "revision_requested" && proof.revisionDeadline) {
          const countdown = calculateCountdown(proof.revisionDeadline, proof.status)
          newCountdowns[proof.id] = countdown

          if (countdown === "EXPIRED" && countdowns[proof.id] !== "EXPIRED") {
            expiredProofs.push({ proofId: proof.id, status: proof.status })
          }
        } else if (proof.status === "cancelled_by_worker" || proof.status === "rejected_accepted") {
          newCountdowns[proof.id] = "AUTO_PROCESSED"
        }
      })

    setCountdowns(newCountdowns)

    expiredProofs.forEach(({ proofId, status }) => {
      processExpiredTimeout(proofId, status)
    })
  }

  useEffect(() => {
    if (applications.length > 0) {
      const stats = calculateJobStats(applications, timeFilter)
      setJobStats(stats)
    }
  }, [applications, timeFilter])

  useEffect(() => {
    if (user?.id) {
      console.log("[v0] Applied Jobs page mounted, loading data for user:", user.id)
      loadWorkProofs()
    }
  }, [user?.id])

  useEffect(() => {
    const interval = setInterval(updateCountdowns, 1000) // Update every second
    return () => clearInterval(interval)
  }, [workProofs, countdowns]) // Include countdowns in dependencies to detect changes

  useEffect(() => {
    if (!user?.id) return

    const refreshInterval = setInterval(() => {
      console.log("[v0] Periodic refresh of application data")
      refreshApplications()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(refreshInterval)
  }, [user?.id])

  const handleRejectionResponse = (proof: WorkProof) => {
    setSelectedRejectedProof(proof)
    setRejectionResponseModalOpen(true)
  }

  const handleRevisionResubmit = (proof: WorkProof) => {
    setSelectedRevisionProof(proof)
    setResubmitModalOpen(true)
  }

  const handleAcceptRejection = async () => {
    if (!selectedRejectedProof) return

    try {
      await acceptRejection(selectedRejectedProof.id)
      toast.success("Rejection accepted. Refund processed to employer.")
      setRejectionResponseModalOpen(false)
      await refreshApplications()
    } catch (error) {
      console.error("Error accepting rejection:", error)
      toast.error("Failed to accept rejection")
    }
  }

  const handleCreateDispute = async () => {
    console.log("[v0] Starting dispute submission...")
    console.log("[v0] Selected proof:", selectedRejectedProof?.id)
    console.log("[v0] Dispute data:", disputeSubmission)

    if (!selectedRejectedProof || !disputeSubmission.reason) {
      console.log("[v0] Validation failed - missing required fields")
      toast.error("Please fill in all required fields")
      return
    }

    try {
      console.log("[v0] Calling createDispute function...")
      await createDispute(selectedRejectedProof.id, disputeSubmission)
      console.log("[v0] Dispute created successfully")
      toast.success("Dispute submitted successfully! Admin will review your case.")
      setRejectionResponseModalOpen(false)
      setDisputeModalOpen(false)
      setDisputeSubmission({
        reason: "",
        requestedAction: "payment" as const,
      })
      await refreshApplications()
    } catch (error) {
      console.error("[v0] Error submitting dispute:", error)

      if (error instanceof Error && error.message.includes("already exists and is pending resolution")) {
        toast.error(
          "A dispute for this job is already being reviewed by our admin team. Please check your existing disputes or wait for the current dispute to be resolved.",
        )
        // Close the modal since the user can't create another dispute
        setRejectionResponseModalOpen(false)
        setDisputeModalOpen(false)
        setDisputeSubmission({
          reason: "",
          requestedAction: "payment" as const,
        })
      } else {
        // Handle other errors with the original error message
        toast.error(`Failed to submit dispute: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
  }

  const handleCancelJob = async (proofId: string) => {
    if (!confirm("Are you sure you want to cancel this job? The employer will receive a full refund.")) {
      return
    }

    try {
      console.log("[v0] Cancelling job for proof:", proofId)

      // Find the work proof to get job and application details
      const proof = Object.values(workProofs)
        .flat()
        .find((p) => p.id === proofId)
      if (!proof) {
        throw new Error("Work proof not found")
      }

      const { cancelJobByWorker } = await import("@/lib/work-proofs")
      await cancelJobByWorker(proofId)

      toast.success("Job cancelled successfully. Employer has been refunded.")
      await refreshApplications()
    } catch (error) {
      console.error("Error cancelling job:", error)
      toast.error("Failed to cancel job")
    }
  }

  const loadWorkProofs = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      console.log("[v0] Loading applications for user:", user.id)
      const userApplications = await getUserApplications(user.id)
      console.log("[v0] Found applications:", userApplications.length)
      setApplications(userApplications)

      const jobIds = [...new Set(userApplications.map((app) => app.jobId))]
      console.log("[v0] Loading jobs for IDs:", jobIds)
      const jobsData: { [key: string]: Job } = {}
      const workProofsData: { [key: string]: WorkProof[] } = {}

      console.log("[v0] Processing expired deadlines immediately...")
      try {
        const response = await fetch("/api/test-cron-now", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const result = await response.json()
          console.log("[v0] Immediate processing completed:", result)
        } else {
          console.log("[v0] Immediate processing failed:", response.status)
        }
      } catch (error) {
        console.error("[v0] Error in immediate processing:", error)
      }

      await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const job = await getJobById(jobId)
            if (job) {
              jobsData[jobId] = job
              console.log("[v0] Loaded job:", job.title)
            }

            const proofs = await getWorkProofsByJob(jobId)
            workProofsData[jobId] = proofs.filter((proof) => proof.workerId === user.id)
            console.log("[v0] Found work proofs for job", jobId, ":", workProofsData[jobId].length)
          } catch (error) {
            console.error(`Error loading data for job ${jobId}:`, error)
          }
        }),
      )

      setJobs(jobsData)
      setWorkProofs(workProofsData)
      console.log("[v0] Applied jobs data loaded successfully")
    } catch (error) {
      console.error("Error loading applications:", error)
      toast.error("Failed to load your jobs")
    } finally {
      setLoading(false)
    }
  }

  const refreshApplications = async () => {
    if (!user?.id) return

    try {
      const userApplications = await getUserApplications(user.id)
      setApplications(userApplications)

      const jobIds = [...new Set(userApplications.map((app) => app.jobId))]
      const jobsData: { [key: string]: Job } = {}
      const workProofsData: { [key: string]: WorkProof[] } = {}

      await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const job = await getJobById(jobId)
            if (job) {
              jobsData[jobId] = job
            }

            const proofs = await getWorkProofsByJob(jobId)
            workProofsData[jobId] = proofs.filter((proof) => proof.workerId === user.id)
          } catch (error) {
            console.error(`Error loading data for job ${jobId}:`, error)
          }
        }),
      )

      setJobs(jobsData)
      setWorkProofs(workProofsData)
    } catch (error) {
      console.error("Error refreshing applications:", error)
      toast.error("Failed to refresh applications")
    }
  }

  const handleSubmitWork = (application: JobApplication) => {
    // Implementation for submitting work
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    // Implementation for handling file upload
  }

  const removeScreenshot = (index: number) => {
    // Implementation for removing screenshot
  }

  const addProofLink = () => {
    // Implementation for adding proof link
  }

  const updateProofLink = (index: number, value: string) => {
    // Implementation for updating proof link
  }

  const removeProofLink = (index: number) => {
    // Implementation for removing proof link
  }

  const submitProof = async () => {
    // Implementation for submitting proof
  }

  const handleResubmitWork = async () => {
    if (!selectedRevisionProof || !user?.id) return

    try {
      setSubmittingProof(true)
      console.log("[v0] Resubmitting work for proof:", selectedRevisionProof.id)

      const formData = document.querySelector("#resubmit-form") as HTMLFormElement
      if (!formData) throw new Error("Form not found")

      const workDescription = (formData.querySelector('[name="workDescription"]') as HTMLTextAreaElement)?.value || ""
      const proofLinks = (formData.querySelector('[name="proofLinks"]') as HTMLTextAreaElement)?.value || ""
      const additionalNotes = (formData.querySelector('[name="additionalNotes"]') as HTMLTextAreaElement)?.value || ""

      if (!workDescription.trim()) {
        toast.error("Please provide a work description")
        return
      }

      const { resubmitWork } = await import("@/lib/work-proofs")
      await resubmitWork(selectedRevisionProof.id, {
        description: workDescription,
        proofLinks: proofLinks.split("\n").filter((link) => link.trim()),
        additionalNotes,
        proofFiles: [],
      })

      toast.success("Work resubmitted successfully!")
      setResubmitModalOpen(false)
      setSelectedRevisionProof(null)
      await refreshApplications()
    } catch (error) {
      console.error("Error resubmitting work:", error)
      toast.error("Failed to resubmit work")
    } finally {
      setSubmittingProof(false)
    }
  }

  const handleViewSubmission = (application: JobApplication) => {
    const jobProofs = workProofs[application.jobId] || []
    const userProof = jobProofs.find((proof) => proof.applicationId === application.id)

    if (userProof) {
      setSelectedWorkProof(userProof)
      setViewSubmissionModalOpen(true)
    } else {
      toast.error("No work submission found for this application")
    }
  }

  const getStatusDisplay = (status: string) => {
    return {
      label: "Waiting",
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <Clock className="h-3 w-3" />,
    }
  }

  const getJobStatus = (application: JobApplication): string => {
    const proofs = application.jobId ? workProofs[application.jobId] || [] : []
    const latestProof = proofs[proofs.length - 1]

    const dispute = disputes[application.jobId]
    if (dispute && dispute.status === "pending") {
      return "under_dispute"
    }
    if (dispute && dispute.status === "resolved_favor_poster") {
      return "dispute_resolved_employer"
    }
    if (dispute && dispute.status === "resolved_favor_worker") {
      return "dispute_resolved_worker"
    }

    if (latestProof) {
      // Check if job was automatically cancelled due to expired deadlines
      if (latestProof.status === "cancelled_by_worker") {
        return "auto_cancelled"
      }
      // Check if rejection was automatically accepted (refunded)
      if (latestProof.status === "rejected_accepted") {
        return "auto_refunded"
      }
      return latestProof.status
    }

    return application.status
  }

  const handleViewApplication = (application: JobApplication) => {
    setSelectedApplication(application)
    setViewApplicationModalOpen(true)
  }

  const getFilteredAndSortedApplications = () => {
    let filtered = applications

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((app) => {
        const job = jobs[app.jobId]
        return (
          job?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job?.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => getJobStatus(app) === statusFilter)
    }

    // Sort by priority: action needed first, then by date
    return filtered.sort((a, b) => {
      const statusA = getJobStatus(a)
      const statusB = getJobStatus(b)

      // Priority order: rejected, revision_requested, ready, then others
      const priorityOrder = {
        rejected: 1,
        revision_requested: 2,
        ready: 3,
        submitted: 4,
        completed: 5,
        disputed: 6, // This might be redundant with under_dispute, dispute_resolved_employer, dispute_resolved_worker
        auto_cancelled: 7,
        auto_refunded: 8,
        waiting: 9,
        under_dispute: 0, // Higher priority for under_dispute
        dispute_resolved_worker: 10, // Lower priority for resolved disputes
        dispute_resolved_employer: 11, // Lowest priority for resolved disputes
      }

      const priorityA = priorityOrder[statusA as keyof typeof priorityOrder] || 10
      const priorityB = priorityOrder[statusB as keyof typeof priorityOrder] || 10

      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      // If same priority, sort by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  const filteredApplications = getFilteredAndSortedApplications()
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedApplications = filteredApplications.slice(startIndex, startIndex + itemsPerPage)

  const readyJobs = applications.filter((app) => getJobStatus(app) === "ready")
  const submittedJobs = applications.filter((app) => getJobStatus(app) === "submitted")
  const completedJobs = applications.filter((app) => getJobStatus(app) === "completed")
  const waitingJobs = applications.filter((app) => getJobStatus(app) === "waiting")
  const revisionJobs = applications.filter((app) => getJobStatus(app) === "revision_requested")
  const rejectedJobs = applications.filter((app) => getJobStatus(app) === "rejected")
  const disputedJobs = applications.filter((app) => getJobStatus(app) === "disputed")
  const autoCancelledJobs = applications.filter((app) => getJobStatus(app) === "auto_cancelled")
  const autoRefundedJobs = applications.filter((app) => getJobStatus(app) === "auto_refunded")
  const underDisputeJobs = applications.filter((app) => getJobStatus(app) === "under_dispute")
  const disputeResolvedEmployerJobs = applications.filter((app) => getJobStatus(app) === "dispute_resolved_employer")
  const disputeResolvedWorkerJobs = applications.filter((app) => getJobStatus(app) === "dispute_resolved_worker")

  const renderApplicationCard = (application: JobApplication) => {
    const job = application.job || jobs[application.jobId]
    if (!job) return null

    const jobProofs = workProofs[application.jobId] || []
    const userProof = jobProofs.find((proof) => proof.applicationId === application.id)
    const status = userProof?.status || application.status
    const dispute = disputes[application.jobId] // Get dispute for this job

    const getCountdownDisplay = (proof: WorkProof) => {
      const countdown = countdowns[proof.id]
      if (!countdown) return null

      const isExpired = countdown === "EXPIRED"
      const isUrgent = countdown.includes("m") && !countdown.includes("h")

      return (
        <div
          className={`p-3 rounded-lg border-2 ${
            isExpired
              ? "bg-red-100 border-red-300"
              : isUrgent
                ? "bg-orange-100 border-orange-300"
                : "bg-yellow-100 border-yellow-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Timer
              className={`h-4 w-4 ${isExpired ? "text-red-600" : isUrgent ? "text-orange-600" : "text-yellow-600"}`}
            />
            <span
              className={`font-semibold text-sm ${
                isExpired ? "text-red-800" : isUrgent ? "text-orange-800" : "text-yellow-800"
              }`}
            >
              {isExpired ? "⚠️ DEADLINE EXPIRED - ACTION REQUIRED!" : `⏰ ${countdown}`}
            </span>
          </div>
          {isExpired && (
            <p className="text-sm text-red-700 mt-1">
              You must take action now or the system will auto-process this request.
            </p>
          )}
        </div>
      )
    }

    return (
      <Card key={application.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <span className="text-base sm:text-lg font-semibold text-pretty">{job.title}</span>
            <div className="flex items-center justify-between sm:justify-end space-x-2">
              <Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewApplication(application)}
                className="h-8 text-xs px-3 shrink-0"
              >
                <Eye className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">View</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
            <div className="flex items-center">
              <Clock className="mr-1 h-3 w-3" />
              Applied {new Date(application.createdAt).toLocaleDateString()}
            </div>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 sm:line-clamp-1 text-pretty">{job?.description}</p>

          {status === "rejected" && userProof && (
            <div className="space-y-3">
              {getCountdownDisplay(userProof)}

              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded text-sm text-red-800">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>
                  Work rejected - You have{" "}
                  {formatTimeDisplay(
                    revisionSettings?.rejectionResponseTimeoutValue || 24,
                    revisionSettings?.rejectionResponseTimeoutUnit || "hours",
                  )}{" "}
                  to respond
                </span>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">⚠️ Important Warning</p>
                    <p>
                      Filing false disputes or submitting fake work may result in account suspension and penalty fees.
                      Only dispute if you genuinely believe your work met the requirements.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleRejectionResponse(userProof)}
                  size="sm"
                  className="w-full sm:w-auto h-10 sm:h-7 text-sm sm:text-xs px-4 sm:px-3 bg-red-600 hover:bg-red-700"
                >
                  Respond to Rejection
                </Button>
              </div>
            </div>
          )}

          {status === "revision_requested" && userProof && (
            <div className="space-y-3">
              {getCountdownDisplay(userProof)}

              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded text-sm text-yellow-800">
                <RefreshCw className="h-4 w-4 shrink-0" />
                <span>
                  Revision requested - You have{" "}
                  {formatTimeDisplay(
                    revisionSettings?.revisionRequestTimeoutValue || 24,
                    revisionSettings?.revisionRequestTimeoutUnit || "hours",
                  )}{" "}
                  to resubmit
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Revision Guidelines</p>
                    <p>
                      Employers can request up to {revisionSettings?.maxRevisionRequests || 2} revisions maximum. If you
                      don't resubmit within{" "}
                      {formatTimeDisplay(
                        revisionSettings?.revisionRequestTimeoutValue || 24,
                        revisionSettings?.revisionRequestTimeoutUnit || "hours",
                      )}
                      , the job will be automatically cancelled with a refund to the employer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  onClick={() => handleRevisionResubmit(userProof)}
                  size="sm"
                  className="w-full sm:w-auto h-10 sm:h-7 text-sm sm:text-xs px-4 sm:px-3 bg-yellow-600 hover:bg-yellow-700"
                >
                  Resubmit Work
                </Button>
                <Button
                  onClick={() => handleCancelJob(userProof.id)}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto h-10 sm:h-7 text-sm sm:text-xs px-4 sm:px-3 bg-transparent"
                >
                  Cancel Job
                </Button>
              </div>
            </div>
          )}

          {status === "auto_cancelled" && userProof && (
            <div className="space-y-3">{renderDeadlineWarning(userProof)}</div>
          )}

          {status === "auto_refunded" && userProof && (
            <div className="space-y-3">{renderDeadlineWarning(userProof)}</div>
          )}

          {dispute && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border-2 ${
                  dispute.status === "pending"
                    ? "bg-orange-50 border-orange-200"
                    : dispute.status === "resolved_favor_worker"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Flag
                    className={`h-4 w-4 ${
                      dispute.status === "pending"
                        ? "text-orange-600"
                        : dispute.status === "resolved_favor_worker"
                          ? "text-green-600"
                          : "text-red-600"
                    }`}
                  />
                  <span
                    className={`font-semibold text-sm ${
                      dispute.status === "pending"
                        ? "text-orange-800"
                        : dispute.status === "resolved_favor_worker"
                          ? "text-green-800"
                          : "text-red-800"
                    }`}
                  >
                    {dispute.status === "pending" && "🔍 Dispute Under Admin Review"}
                    {dispute.status === "resolved_favor_worker" && "✅ Dispute Resolved in Your Favor"}
                    {dispute.status === "resolved_favor_poster" && "❌ Dispute Resolved Against You"}
                  </span>
                </div>
                <p
                  className={`text-sm mt-1 ${
                    dispute.status === "pending"
                      ? "text-orange-700"
                      : dispute.status === "resolved_favor_worker"
                        ? "text-green-700"
                        : "text-red-700"
                  }`}
                >
                  {dispute.status === "pending" &&
                    "Admin is reviewing the reported issue. You'll be notified of the decision."}
                  {dispute.status === "resolved_favor_worker" &&
                    "Admin found in your favor. Payment has been processed."}
                  {dispute.status === "resolved_favor_poster" &&
                    "Admin found against you. The employer's complaint was valid."}
                </p>
                {dispute.resolution_notes && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <p className="text-xs font-medium text-gray-700">Admin Decision:</p>
                    <p className="text-xs text-gray-600">{dispute.resolution_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "ready":
        return "Ready to Work"
      case "submitted":
        return "Under Review"
      case "approved":
      case "auto_approved":
        return "Completed"
      case "rejected":
        return "Action Required"
      case "revision_requested":
        return "Revision Needed"
      case "rejected_accepted":
        return "Rejection Accepted"
      case "disputed":
        return "Under Dispute"
      case "cancelled_by_worker":
        return "Cancelled"
      case "auto_cancelled":
        return "Auto-Cancelled"
      case "auto_refunded":
        return "Auto-Refunded"
      case "under_dispute":
        return "Under Admin Review"
      case "dispute_resolved_employer":
        return "Dispute Lost"
      case "dispute_resolved_worker":
        return "Dispute Won"
      default:
        return "Waiting"
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "ready":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg shadow-blue-200 font-semibold px-3 py-1.5 animate-pulse"
      case "submitted":
        return "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-500 shadow-lg shadow-purple-200 font-semibold px-3 py-1.5"
      case "approved":
      case "auto_approved":
        return "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 shadow-lg shadow-green-200 font-semibold px-3 py-1.5 ring-2 ring-green-300"
      case "rejected":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500 shadow-lg shadow-red-200 font-semibold px-3 py-1.5 animate-bounce"
      case "revision_requested":
        return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-500 shadow-lg shadow-yellow-200 font-semibold px-3 py-1.5 ring-2 ring-yellow-300"
      case "rejected_accepted":
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-500 shadow-lg shadow-gray-200 font-semibold px-3 py-1.5"
      case "disputed":
        return "bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-500 shadow-lg shadow-orange-200 font-semibold px-3 py-1.5 ring-2 ring-orange-300 animate-pulse"
      case "cancelled_by_worker":
        return "bg-gradient-to-r from-slate-500 to-slate-600 text-white border-slate-500 shadow-lg shadow-slate-200 font-semibold px-3 py-1.5"
      case "auto_cancelled":
        return "bg-green-100 text-green-800 border-green-300"
      case "auto_refunded":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "under_dispute":
        return "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 shadow-lg shadow-orange-200 font-semibold px-3 py-1.5 ring-2 ring-orange-300"
      case "dispute_resolved_employer":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500 shadow-lg shadow-red-200 font-semibold px-3 py-1.5"
      case "dispute_resolved_worker":
        return "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 shadow-lg shadow-green-200 font-semibold px-3 py-1.5 ring-2 ring-green-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const renderDeadlineWarning = (proof: WorkProof) => {
    const countdown = countdowns[proof.id]
    if (!countdown) return null

    const isAutoProcessed = countdown === "AUTO_PROCESSED"
    const isExpired = countdown === "EXPIRED"
    const isUrgent = countdown.includes("m") && !countdown.includes("h")

    if (isAutoProcessed) {
      return (
        <div className="p-3 rounded-lg border-2 bg-green-100 border-green-300">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-800">✅ AUTO-PROCESSED - REFUND ISSUED</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            This request was automatically processed and refunded due to deadline expiration.
          </p>
        </div>
      )
    }

    return null
  }

  const formatTimeDisplay = (value: number, unit: string): string => {
    if (unit === "hours") {
      return `${value} hours`
    } else if (unit === "days") {
      return `${value} days`
    } else {
      return `${value} ${unit}`
    }
  }

  useEffect(() => {
    const loadRevisionSettings = async () => {
      try {
        const settings = await getRevisionSettingsFromAPI()
        setRevisionSettings(settings)
        console.log("[v0] Loaded revision settings from API in applied jobs:", settings)
      } catch (error) {
        console.error("Failed to load revision settings in applied jobs:", error)
        // Set default settings if API fails
        setRevisionSettings({
          maxRevisionRequests: 2,
          revisionRequestTimeoutValue: 24,
          revisionRequestTimeoutUnit: "hours",
          rejectionResponseTimeoutValue: 24,
          rejectionResponseTimeoutUnit: "hours",
          enableAutomaticRefunds: true,
          refundOnRevisionTimeout: true,
          refundOnRejectionTimeout: true,
          enableRevisionWarnings: true,
          revisionPenaltyEnabled: false,
          revisionPenaltyAmount: 0,
        })
      }
    }

    loadRevisionSettings()
  }, [])

  if (loading) {
    return (
      <>
        <DashboardHeader title="My Jobs" description="Track your work and earnings" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your jobs...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader title="Applied Jobs" description="Track your job applications and submissions" />

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Job Statistics</h2>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 sm:mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                  <Target className="mr-2 h-4 w-4" />
                  <span>Total Applied</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{jobStats.totalApplied}</div>
                <p className="text-xs text-blue-600 mt-1">Job applications</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center">
                  <XCircle className="mr-2 h-4 w-4" />
                  <span>Total Rejected</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">{jobStats.totalRejected}</div>
                <p className="text-xs text-red-600 mt-1">Applications rejected</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-700 flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Total Pending</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900">{jobStats.totalPending}</div>
                <p className="text-xs text-yellow-600 mt-1">Awaiting response</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Total Accepted</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">{jobStats.totalAccepted}</div>
                <p className="text-xs text-green-600 mt-1">Applications accepted</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  <span>Upcoming Money</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">${jobStats.upcomingMoney.toFixed(2)}</div>
                <p className="text-xs text-purple-600 mt-1">From pending jobs</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 flex items-center">
                  <Wallet className="mr-2 h-4 w-4" />
                  <span>Total Earnings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">${jobStats.totalEarnings.toFixed(2)}</div>
                <p className="text-xs text-emerald-600 mt-1">Completed jobs</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applied Jobs Yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't applied to any jobs yet. Start browsing available jobs to find work opportunities.
            </p>
            <Button onClick={() => (window.location.href = "/jobs")} className="bg-blue-600 hover:bg-blue-700">
              Browse Jobs
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 sm:w-64"
                />
                <Button variant="outline" size="icon" className="shrink-0 bg-transparent">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Select onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ready">Ready to Work</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="revision_requested">Revision Requested</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="auto_cancelled">Auto-Cancelled</SelectItem>
                    <SelectItem value="auto_refunded">Auto-Refunded</SelectItem>
                    <SelectItem value="under_dispute">Under Admin Review</SelectItem>
                    <SelectItem value="dispute_resolved_employer">Dispute Lost</SelectItem>
                    <SelectItem value="dispute_resolved_worker">Dispute Won</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 per page</SelectItem>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="icon" className="shrink-0 sm:inline-flex bg-transparent">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">{paginatedApplications.map(renderApplicationCard)}</div>
            <div className="mt-8">
              <Pagination>
                <PaginationContent>
                  <PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}>
                    Previous
                  </PaginationPrevious>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <PaginationItem key={index + 1} onClick={() => setCurrentPage(index + 1)}>
                      <PaginationLink isActive={currentPage === index + 1}>{index + 1}</PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationNext onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}>
                    Next
                  </PaginationNext>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </div>

      <Dialog open={rejectionResponseModalOpen} onOpenChange={setRejectionResponseModalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Respond to Work Rejection</DialogTitle>
            <DialogDescription>
              Your work submission has been rejected. You can either accept the rejection (refund will be processed) or
              create a dispute if you believe your work met the requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {selectedRejectedProof && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Rejection Details</h4>
                <p className="text-sm text-red-800">
                  <strong>Reason:</strong> {selectedRejectedProof.rejectionReason || "No specific reason provided"}
                </p>
                {selectedRejectedProof.rejectionDeadline && (
                  <p className="text-sm text-red-800 mt-1">
                    <strong>Response Deadline:</strong>{" "}
                    {new Date(selectedRejectedProof.rejectionDeadline).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">⚠️ Important Warning</p>
                  <p>
                    Filing false disputes or submitting fake work may result in account suspension and penalty fees.
                    Only dispute if you genuinely believe your work met the requirements.
                  </p>
                </div>
              </div>
            </div>

            <RadioGroup
              value={disputeModalOpen ? "dispute" : "accept"}
              onValueChange={(value) => setDisputeModalOpen(value === "dispute")}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="accept" id="accept" />
                <Label htmlFor="accept" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Accept Rejection</p>
                    <p className="text-sm text-gray-600">
                      I acknowledge the rejection is valid. The employer will receive a full refund.
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="dispute" id="dispute" />
                <Label htmlFor="dispute" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Create Dispute</p>
                    <p className="text-sm text-gray-600">
                      I believe my work met the requirements and want admin review.
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {disputeModalOpen && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label htmlFor="dispute-reason">Dispute Reason *</Label>
                  <Textarea
                    id="dispute-reason"
                    placeholder="Explain why you believe your work met the requirements..."
                    value={disputeSubmission.reason}
                    onChange={(e) => setDisputeSubmission((prev) => ({ ...prev, reason: e.target.value }))}
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Requested Action</Label>
                  <RadioGroup
                    value={disputeSubmission.requestedAction}
                    onValueChange={(value) =>
                      setDisputeSubmission((prev) => ({ ...prev, requestedAction: value as "payment" | "revision" }))
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="payment" id="payment" />
                      <Label htmlFor="payment">Release payment to me</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="revision" id="revision" />
                      <Label htmlFor="revision">Allow me to revise the work</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectionResponseModalOpen(false)
                  setDisputeModalOpen(false)
                  setDisputeSubmission({
                    reason: "",
                    requestedAction: "payment" as const,
                  })
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              {disputeModalOpen ? (
                <Button
                  onClick={handleCreateDispute}
                  disabled={!disputeSubmission.reason}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  Submit Dispute
                </Button>
              ) : (
                <Button onClick={handleAcceptRejection} className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700">
                  Accept Rejection
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AppliedJobsPage
