"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Search, Eye, Check, X, Clock, RefreshCw, FileText, ExternalLink, Timer } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { getJobById, getJobStatusColor, type Job } from "@/lib/jobs"
import {
  getWorkProofsByJob,
  type WorkProof,
  getWorkProofStatusColor,
  getWorkProofStatusLabel,
  isWorkProofDeadlineExpired,
  getWorkProofEffectiveStatus,
} from "@/lib/work-proofs"
import { EnhancedWorkProofModal } from "@/components/work-proofs/enhanced-work-proof-modal"

export default function WorkProofsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [workProofs, setWorkProofs] = useState<WorkProof[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedProof, setSelectedProof] = useState<WorkProof | null>(null)
  const [proofModalOpen, setProofModalOpen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("[v0] Loading job and work proofs for:", jobId)
        const [jobData, proofsData] = await Promise.all([getJobById(jobId), getWorkProofsByJob(jobId)])

        if (!jobData) {
          toast.error("Job not found")
          router.push("/dashboard/jobs")
          return
        }

        if (jobData.userId !== user?.id) {
          toast.error("You don't have permission to view these work proofs")
          router.push("/dashboard/jobs")
          return
        }

        setJob(jobData)
        setWorkProofs(proofsData)
        console.log("[v0] Loaded work proofs:", proofsData.length)
      } catch (error) {
        console.error("[v0] Error loading data:", error)
        toast.error("Failed to load work proofs")
      } finally {
        setLoading(false)
      }
    }

    if (jobId && user?.id) {
      fetchData()
    }
  }, [jobId, user?.id, router])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(async () => {
      if (!loading && jobId) {
        try {
          const updatedProofs = await getWorkProofsByJob(jobId)
          setWorkProofs(updatedProofs)
        } catch (error) {
          console.error("[v0] Auto-refresh failed:", error)
        }
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, loading, jobId])

  const getFilteredProofs = () => {
    return workProofs.filter((proof) => {
      const matchesSearch =
        proof.worker.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proof.worker.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proof.worker.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proof.description.toLowerCase().includes(searchTerm.toLowerCase())

      let matchesStatus = false
      if (statusFilter === "all") {
        matchesStatus = true
      } else if (statusFilter === "approved") {
        const isExpired = isWorkProofDeadlineExpired(proof, job)
        matchesStatus =
          proof.status === "approved" || proof.status === "auto_approved" || (proof.status === "submitted" && isExpired)
        console.log(
          "[v0] Filtering proof",
          proof.id,
          "for approved - status:",
          proof.status,
          "isExpired:",
          isExpired,
          "matches:",
          matchesStatus,
        )
      } else {
        matchesStatus = proof.status === statusFilter
      }

      return matchesSearch && matchesStatus
    })
  }

  const filteredProofs = getFilteredProofs()
  const totalPages = Math.ceil(filteredProofs.length / itemsPerPage)
  const paginatedProofs = filteredProofs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getStatusCounts = () => {
    console.log("[v0] Calculating status counts for", workProofs.length, "work proofs")

    const approvedCount = workProofs.filter((p) => {
      if (p.status === "approved") {
        console.log("[v0] Work proof", p.id, "is manually approved")
        return true
      }

      if (p.status === "auto_approved") {
        console.log("[v0] Work proof", p.id, "is auto-approved in database")
        return true
      }

      // Also count submitted work proofs with expired deadlines
      const effectiveStatus = getWorkProofEffectiveStatus(p, job)
      const isExpired = isWorkProofDeadlineExpired(p, job)

      console.log(
        "[v0] Work proof",
        p.id,
        "- effectiveStatus:",
        effectiveStatus,
        "isExpired:",
        isExpired,
        "status:",
        p.status,
      )

      if (p.status === "submitted" && isExpired) {
        console.log("[v0] Work proof", p.id, "should be counted as auto-approved")
        return true
      }

      return false
    }).length

    console.log("[v0] Final approved count:", approvedCount)

    return {
      all: workProofs.length,
      submitted: workProofs.filter((p) => p.status === "submitted" && !isWorkProofDeadlineExpired(p, job)).length,
      approved: approvedCount,
      rejected: workProofs.filter((p) => p.status === "rejected").length,
      revision_requested: workProofs.filter((p) => p.status === "revision_requested").length,
    }
  }

  const statusCounts = getStatusCounts()

  const handleViewProof = (proof: WorkProof) => {
    setSelectedProof(proof)
    setProofModalOpen(true)
  }

  const handleProofUpdate = async () => {
    try {
      const updatedProofs = await getWorkProofsByJob(jobId)
      setWorkProofs(updatedProofs)
      toast.success("Work proofs updated")
    } catch (error) {
      console.error("[v0] Error updating proofs:", error)
      toast.error("Failed to update work proofs")
    }
  }

  const refreshProofs = async () => {
    setLoading(true)
    try {
      const updatedProofs = await getWorkProofsByJob(jobId)
      setWorkProofs(updatedProofs)
      toast.success("Work proofs refreshed")
    } catch (error) {
      console.error("[v0] Error refreshing proofs:", error)
      toast.error("Failed to refresh work proofs")
    } finally {
      setLoading(false)
    }
  }

  const getApprovalCountdown = (proof: WorkProof) => {
    if (!job || job.approvalType !== "manual" || proof.status !== "submitted") {
      return null
    }

    const submittedAt = new Date(proof.submittedAt)
    const approvalDays = job.manualApprovalDays || 3 // Default to 3 days
    const deadlineDate = new Date(submittedAt.getTime() + approvalDays * 24 * 60 * 60 * 1000)
    const now = new Date()
    const timeLeft = deadlineDate.getTime() - now.getTime()

    if (timeLeft <= 0) {
      return {
        expired: true,
        message: "Instant Approval Enabled - Payment processing automatically",
        color: "text-green-600",
        autoApproval: true,
      }
    }

    const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000))
    const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000)

    let timeString = ""
    let color = "text-blue-600"

    if (days > 0) {
      timeString = `${days}d ${hours}h left`
      color = days <= 1 ? "text-orange-600" : "text-blue-600"
    } else if (hours > 0) {
      timeString = `${hours}h ${minutes}m left`
      color = hours <= 6 ? "text-red-600" : "text-orange-600"
    } else {
      timeString = `${minutes}m ${seconds}s left`
      color = "text-red-600"
    }

    return {
      expired: false,
      message: timeString,
      color,
      urgent: hours <= 6,
    }
  }

  const handleProcessTimeouts = async () => {
    try {
      const { checkAndProcessTimeouts } = await import("@/lib/work-proofs")
      const result = await checkAndProcessTimeouts()

      if (result.processed > 0) {
        toast.success(`Processed ${result.processed} expired work proofs`)
        await refreshProofs()
      } else {
        toast.info("No expired work proofs found")
      }
    } catch (error) {
      console.error("[v0] Error processing timeouts:", error)
      toast.error("Failed to process timeouts")
    }
  }

  if (loading) {
    return (
      <>
        <DashboardHeader title="Work Proofs" description="Loading work proofs..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading work proofs...</p>
          </div>
        </div>
      </>
    )
  }

  if (!job) {
    return (
      <>
        <DashboardHeader title="Work Proofs" description="Job not found" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Job not found</p>
            <Link href="/dashboard/jobs">
              <Button className="mt-4">Back to My Jobs</Button>
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader title="Work Proofs" description={`Review submissions for "${job.title}"`} />

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link href="/dashboard/jobs">
              <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Jobs
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-between sm:justify-start space-x-2">
                <span className="text-sm text-gray-600">Auto-refresh:</span>
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? "ON" : "OFF"}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={refreshProofs}
                  disabled={loading}
                  className="flex-1 sm:flex-none bg-transparent"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleProcessTimeouts}
                  className="flex-1 sm:flex-none bg-transparent"
                >
                  <Timer className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Process Timeouts</span>
                  <span className="sm:hidden">Process</span>
                </Button>
              </div>
            </div>
          </div>

          <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">{job.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm sm:text-base">{job.description}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-gray-500">
                    <span>
                      Budget: ${job.budgetMin} - ${job.budgetMax}
                    </span>
                    <span>Workers: {job.workersNeeded}</span>
                    <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <Badge className={`text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 ${getJobStatusColor(job.status)}`}>
                    {job.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-4">
              {/* Mobile: Stack tabs vertically, Desktop: Horizontal */}
              <div className="block sm:hidden">
                <TabsList className="grid w-full grid-cols-2 gap-1">
                  <TabsTrigger value="all" className="text-xs">
                    All ({statusCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="submitted" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending ({statusCounts.submitted})
                  </TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-3 gap-1 mt-2">
                  <TabsTrigger value="approved" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Approved ({statusCounts.approved})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Rejected ({statusCounts.rejected})
                  </TabsTrigger>
                  <TabsTrigger value="revision_requested" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Revisions ({statusCounts.revision_requested})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Desktop: Horizontal tabs */}
              <div className="hidden sm:flex sm:items-center sm:justify-between">
                <TabsList className="grid w-full max-w-2xl grid-cols-5">
                  <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
                  <TabsTrigger value="submitted">
                    <Clock className="h-4 w-4 mr-1" />
                    Pending ({statusCounts.submitted})
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    <Check className="h-4 w-4 mr-1" />
                    Approved ({statusCounts.approved})
                  </TabsTrigger>
                  <TabsTrigger value="rejected">
                    <X className="h-4 w-4 mr-1" />
                    Rejected ({statusCounts.rejected})
                  </TabsTrigger>
                  <TabsTrigger value="revision_requested">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Revisions ({statusCounts.revision_requested})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search submissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>

                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value={statusFilter} className="space-y-4">
              {paginatedProofs.length > 0 ? (
                <div className="grid gap-4">
                  {paginatedProofs.map((proof) => (
                    <Card key={proof.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          {proof.worker.firstName} {proof.worker.lastName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4">
                          {/* Worker info section */}
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
                                {proof.worker.firstName[0]}
                                {proof.worker.lastName[0]}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <p className="text-sm text-gray-600">@{proof.worker.username}</p>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                  {(() => {
                                    const effectiveStatus = getWorkProofEffectiveStatus(proof, job)
                                    const isExpired = isWorkProofDeadlineExpired(proof, job)

                                    if (effectiveStatus === "auto_approved" && isExpired) {
                                      return (
                                        <Badge className="bg-green-100 text-green-800 text-xs sm:text-sm">
                                          Auto-Approved (Deadline Expired)
                                        </Badge>
                                      )
                                    } else {
                                      return (
                                        <Badge
                                          className={`text-xs sm:text-sm ${getWorkProofStatusColor(proof.status)}`}
                                        >
                                          {getWorkProofStatusLabel(proof.status)}
                                        </Badge>
                                      )
                                    }
                                  })()}
                                  <div className="text-left sm:text-right">
                                    <div className="text-lg sm:text-xl font-bold text-green-600">
                                      ${proof.paymentAmount.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-500">Payment Amount</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Countdown section */}
                          {(() => {
                            const countdown = getApprovalCountdown(proof)
                            if (countdown && job?.approvalType === "manual") {
                              return (
                                <div
                                  className={`p-3 rounded-lg border-2 ${
                                    countdown.expired
                                      ? countdown.autoApproval
                                        ? "bg-green-50 border-green-200"
                                        : "bg-orange-50 border-orange-200"
                                      : countdown.urgent
                                        ? "bg-red-50 border-red-200"
                                        : "bg-blue-50 border-blue-200"
                                  }`}
                                >
                                  <div className="flex items-start space-x-2">
                                    <Timer className={`h-4 w-4 mt-0.5 ${countdown.color}`} />
                                    <div className="flex-1 min-w-0">
                                      <div className={`font-semibold text-sm sm:text-base ${countdown.color}`}>
                                        {countdown.expired
                                          ? countdown.autoApproval
                                            ? "Instant Approval Enabled"
                                            : "Review Deadline Expired"
                                          : "Manual Review Countdown"}
                                      </div>
                                      <div className={`text-xs sm:text-sm ${countdown.color}`}>
                                        {countdown.expired
                                          ? countdown.autoApproval
                                            ? "Payment will be processed automatically"
                                            : "Manual review required"
                                          : `${countdown.message} until auto-payment`}
                                      </div>
                                    </div>
                                    {!countdown.expired && countdown.urgent && (
                                      <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-medium">
                                        URGENT
                                      </div>
                                    )}
                                    {countdown.expired && countdown.autoApproval && (
                                      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                        AUTO
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })()}

                          {/* Work description */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">{proof.title}</h4>
                            <p className="text-gray-700 text-sm line-clamp-3">{proof.description}</p>
                          </div>

                          {/* Submission details and action */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                              <span>Submitted: {new Date(proof.submittedAt).toLocaleDateString()}</span>
                              {proof.screenshots && proof.screenshots.length > 0 && (
                                <span className="flex items-center">
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  {proof.screenshots.length} files
                                </span>
                              )}
                              {proof.proofLinks && proof.proofLinks.length > 0 && (
                                <span className="flex items-center">
                                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  {proof.proofLinks.length} links
                                </span>
                              )}
                            </div>

                            <Button
                              onClick={() => handleViewProof(proof)}
                              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                              size="sm"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Review Submission
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {statusFilter === "all"
                      ? "No Work Submissions Yet"
                      : `No ${statusFilter.replace("_", " ")} Submissions`}
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base px-4">
                    {statusFilter === "all"
                      ? "When workers submit their completed work, you'll be able to review it here."
                      : `No submissions with ${statusFilter.replace("_", " ")} status found.`}
                  </p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredProofs.length)} of {filteredProofs.length} submissions
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        const page = i + 1
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0 text-xs"
                          >
                            {page}
                          </Button>
                        )
                      })}
                      {totalPages > 3 && <span className="text-gray-400">...</span>}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Enhanced Work Proof Modal */}
      <EnhancedWorkProofModal
        proof={selectedProof}
        isOpen={proofModalOpen}
        onClose={() => {
          setProofModalOpen(false)
          setSelectedProof(null)
        }}
        onUpdate={handleProofUpdate}
        userRole="employer"
      />
    </>
  )
}
