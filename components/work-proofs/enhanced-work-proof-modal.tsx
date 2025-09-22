"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  X,
  Check,
  RotateCcw,
  DollarSign,
  Gift,
  Star,
  Download,
  Eye,
  Award,
  MessageCircle,
  AlertTriangle,
  ImageIcon,
  Clock,
  Flag,
} from "lucide-react"
import { toast } from "sonner"
import { type WorkProof, getWorkProofStatusLabel } from "@/lib/work-proofs"
import { ReviewForm } from "@/components/reviews/review-form"
import { ChatWindow } from "@/components/chat/chat-window"
import { createChat, getChatMessages, sendMessage } from "@/lib/chat"
import { getRevisionSettingsFromAPI, type RevisionSettings } from "@/lib/admin-settings"

interface EnhancedWorkProofModalProps {
  proof: WorkProof | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  userRole: "employer" | "worker"
}

export function EnhancedWorkProofModal({ proof, isOpen, onClose, onUpdate, userRole }: EnhancedWorkProofModalProps) {
  const [reviewNotes, setReviewNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [tipAmount, setTipAmount] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [showTipForm, setShowTipForm] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatData, setChatData] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [revisionSettings, setRevisionSettings] = useState<RevisionSettings>({
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

  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportType, setReportType] = useState<string>("fake_work")
  const [reportEvidence, setReportEvidence] = useState("")

  const remainingRevisions = revisionSettings.maxRevisionRequests - (proof?.revisionCount || 0)

  // Helper function to format time display correctly
  const formatTimeDisplay = (value: number, unit: string) => {
    if (unit === "minutes") {
      return value === 1 ? "1 minute" : `${value} minutes`
    } else if (unit === "hours") {
      return value === 1 ? "1 hour" : `${value} hours`
    } else if (unit === "days") {
      return value === 1 ? "1 day" : `${value} days`
    }
    // Fallback to hours if unit is not recognized
    return value === 1 ? "1 hour" : `${value} hours`
  }

  // Calculate timeout information based on admin settings
  const getTimeoutInfo = () => {
    if (!proof) return null

    const now = new Date()
    let timeoutValue = 24 // default fallback
    let timeoutUnit = "hours"
    let timeoutLabel = "Response Time"

    if (proof.status === "revision_requested") {
      // Use revision-specific timeout settings
      timeoutValue = revisionSettings.revisionRequestTimeoutValue || 24
      timeoutUnit = revisionSettings.revisionRequestTimeoutUnit || "hours"
      timeoutLabel = `Revision Response (${formatTimeDisplay(timeoutValue, timeoutUnit)})`
    } else if (proof.status === "rejected") {
      // Use rejection-specific timeout settings
      timeoutValue = revisionSettings.rejectionResponseTimeoutValue || 24
      timeoutUnit = revisionSettings.rejectionResponseTimeoutUnit || "hours"
      timeoutLabel = `Rejection Response (${formatTimeDisplay(timeoutValue, timeoutUnit)})`
    }

    // Calculate deadline based on last action timestamp
    const lastActionTime = proof.reviewedAt ? new Date(proof.reviewedAt) : new Date(proof.submittedAt)
    const deadline = new Date(lastActionTime.getTime() + timeoutValue * 60 * 60 * 1000)
    const timeRemaining = deadline.getTime() - now.getTime()
    const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)))
    const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)))

    return {
      deadline,
      hoursRemaining,
      minutesRemaining,
      timeoutLabel,
      isExpired: timeRemaining <= 0,
    }
  }

  const timeoutInfo = getTimeoutInfo()

  useEffect(() => {
    const loadRevisionSettings = async () => {
      try {
        const settings = await getRevisionSettingsFromAPI()
        setRevisionSettings(settings)
        console.log("[v0] Loaded revision settings from API in modal:", settings)
      } catch (error) {
        console.error("Failed to load revision settings in modal:", error)
      }
    }

    loadRevisionSettings()
  }, [])

  if (!proof) return null

  const totalPayment = proof.paymentAmount + (Number.parseFloat(tipAmount) || 0)

  const handleOpenChat = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")

      // Create or get existing chat with the worker
      const chat = await createChat({
        type: "order",
        title: `Job Discussion - ${proof.title}`,
        participants: [
          {
            id: currentUser.id,
            name: `${currentUser.firstName} ${currentUser.lastName}`,
            avatar: currentUser.avatar || "",
            isOnline: true,
          },
          {
            id: proof.workerId,
            name: `${proof.worker.firstName} ${proof.worker.lastName}`,
            avatar: proof.worker.avatar || "",
            isOnline: false,
          },
        ],
      })

      const messages = await getChatMessages(chat.id)
      setChatData(chat)
      setChatMessages(messages)
      setShowChat(true)
    } catch (error) {
      console.error("Failed to open chat:", error)
      toast.error("Failed to open chat. Please try again.")
    }
  }

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!chatData) return

    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")
      await sendMessage(chatData.id, currentUser.id, content, files)

      // Refresh messages
      const messages = await getChatMessages(chatData.id)
      setChatMessages(messages)
    } catch (error) {
      console.error("Failed to send message:", error)
      toast.error("Failed to send message. Please try again.")
    }
  }

  const handleApprove = async () => {
    setActionLoading("approve")
    try {
      console.log("[v0] 🔄 Starting approval process for proof:", proof.id)
      console.log("[v0] 💰 Payment amount to be released:", proof.paymentAmount)

      const response = await fetch("/api/work-proofs/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proofId: proof.id,
          reviewNotes,
          tipAmount: tipAmount && Number.parseFloat(tipAmount) > 0 ? Number.parseFloat(tipAmount) : null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to approve work proof")
      }

      console.log("[v0] ✅ Work proof approved successfully via API")
      toast.success(result.message || "Work approved and payment released!")

      setShowReviewForm(true)

      onUpdate()
    } catch (error) {
      console.error("[v0] ❌ CRITICAL ERROR: Failed to approve work proof:", error)
      toast.error(error instanceof Error ? error.message : "Failed to approve work. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReviewSubmit = () => {
    setShowReviewForm(false)
    onClose()
  }

  const handleReviewClose = () => {
    setShowReviewForm(false)
    onClose()
  }

  const handleViewScreenshot = (screenshot: string) => {
    setSelectedScreenshot(screenshot)
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    setActionLoading("reject")
    try {
      const response = await fetch("/api/work-proofs/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proofId: proof.id,
          rejectionReason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to reject work proof")
      }

      console.log("[v0] ✅ Work proof rejected successfully via API")
      toast.success(result.message || "Work rejected. Payment has been refunded.")

      onUpdate()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject work")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRequestRevision = async () => {
    if (!reviewNotes.trim()) {
      toast.error("Please provide revision notes")
      return
    }

    setActionLoading("revision")
    try {
      const response = await fetch("/api/work-proofs/request-revision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proofId: proof.id,
          reviewNotes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to request revision")
      }

      console.log("[v0] ✅ Revision requested successfully via API")
      toast.success(result.message || "Revision requested")

      onUpdate()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request revision")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReportAdmin = async () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for reporting")
      return
    }

    setActionLoading("report")
    try {
      const response = await fetch("/api/disputes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: proof.jobId,
          reportedUserId: proof.workerId,
          disputeType: reportType,
          title: `Report: ${reportType.replace("_", " ")} - ${proof.title}`,
          description: reportReason,
          evidence: reportEvidence,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit report")
      }

      toast.success("Report submitted successfully. Admin will review this case.")
      setShowReportForm(false)
      setReportReason("")
      setReportEvidence("")
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit report")
    } finally {
      setActionLoading(null)
    }
  }

  if (showChat && chatData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">
                  Chat with {proof.worker.firstName} {proof.worker.lastName}
                </DialogTitle>
                <p className="text-blue-100 text-sm">Discuss job: {proof.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className="text-white hover:bg-white/20"
                >
                  Back to Review
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 h-[600px]">
            <ChatWindow
              chat={chatData}
              messages={chatMessages}
              currentUserId={JSON.parse(localStorage.getItem("currentUser") || "{}").id}
              onSendMessage={handleSendMessage}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 mx-1 sm:mx-auto">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white p-3 sm:p-6">
            <DialogHeader>
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-base sm:text-2xl font-bold leading-tight">
                      {userRole === "worker" ? "My Work Submission" : "Work Submission Review"}
                    </DialogTitle>
                    <p className="text-blue-100 mt-1 text-xs sm:text-base leading-relaxed">
                      {userRole === "worker"
                        ? "View your submitted work and status"
                        : "Evaluate the completed work and process payment"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 ml-2">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-white/20 text-white border-white/30 px-2 py-1 text-xs font-medium">
                    {getWorkProofStatusLabel(proof.status)}
                  </Badge>
                  {timeoutInfo && (proof.status === "revision_requested" || proof.status === "rejected") && (
                    <Badge
                      className={`px-2 py-1 text-xs font-medium ${timeoutInfo.isExpired ? "bg-red-500 text-white" : "bg-yellow-500 text-white"}`}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {timeoutInfo.isExpired
                        ? "Expired"
                        : `${timeoutInfo.hoursRemaining}h ${timeoutInfo.minutesRemaining}m left`}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
            {userRole === "worker" ? (
              <>
                <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-base sm:text-xl font-bold text-gray-900">Your Submission Status</h3>
                          <p className="text-blue-600 font-medium text-sm">
                            Submitted {new Date(proof.submittedAt).toLocaleDateString()}
                          </p>
                          {proof.reviewedAt && (
                            <p className="text-gray-600 text-xs">
                              Reviewed {new Date(proof.reviewedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                          <Badge
                            className={`text-sm px-3 py-1 ${
                              proof.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : proof.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : proof.status === "revision_requested"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {getWorkProofStatusLabel(proof.status)}
                          </Badge>
                          <div className="text-xl sm:text-2xl font-bold text-green-600">
                            ${proof.paymentAmount.toFixed(2)}
                          </div>
                          <p className="text-xs text-gray-600">Payment Amount</p>
                        </div>
                      </div>

                      {timeoutInfo && (proof.status === "revision_requested" || proof.status === "rejected") && (
                        <div
                          className={`p-3 rounded-lg text-sm ${timeoutInfo.isExpired ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                        >
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            <div>
                              <div className="font-medium">
                                {timeoutInfo.isExpired ? "Response Time Expired" : "Response Time Remaining"}
                              </div>
                              <div className="text-xs mt-1">
                                {timeoutInfo.isExpired
                                  ? "The response deadline has passed"
                                  : `${timeoutInfo.hoursRemaining} hours ${timeoutInfo.minutesRemaining} minutes left`}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Work Submission Details */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center">
                    <Eye className="mr-2 h-5 w-5 text-blue-600" />
                    Your Work Submission
                  </h4>

                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <h5 className="font-medium text-gray-900 mb-2">{proof.title}</h5>
                      <p className="text-gray-700 leading-relaxed">{proof.description}</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <>
                <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-start space-x-3 flex-1">
                          <Avatar className="h-10 w-10 sm:h-16 sm:w-16 border-4 border-white shadow-lg flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold">
                              {proof.worker.firstName?.[0] || "W"}
                              {proof.worker.lastName?.[0] || "W"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                              {proof.worker.firstName || "Worker"} {proof.worker.lastName || ""}
                            </h3>
                            <p className="text-blue-600 font-medium text-sm truncate">
                              @{proof.worker.username || "worker"}
                            </p>
                            <div className="flex flex-wrap items-center mt-2 gap-2 text-xs sm:text-sm">
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="ml-1 font-medium">{proof.worker.rating || "4.8"}</span>
                              </div>
                              <div className="flex items-center">
                                <Award className="h-3 w-3 text-purple-500" />
                                <span className="ml-1">{proof.worker.badge || "Top Rated"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                          <div className="text-xl sm:text-3xl font-bold text-green-600">
                            ${proof.paymentAmount.toFixed(2)}
                          </div>
                          <p className="text-xs text-gray-600">Base Payment</p>
                        </div>
                      </div>

                      <Button
                        onClick={handleOpenChat}
                        size="sm"
                        className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Chat with Worker
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-orange-100 rounded-full p-2 flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-lg font-semibold text-orange-800 mb-2">
                          Having Issues with the Work?
                        </h4>
                        <p className="text-orange-700 mb-3 text-sm leading-relaxed">
                          If you notice any problems or need clarification about the submitted work,
                          <strong> contact the worker directly</strong> before making a decision. Clear communication
                          helps resolve issues quickly and fairly.
                        </p>
                        <div className="flex flex-col sm:flex-row items-start gap-2">
                          <Button
                            onClick={handleOpenChat}
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white font-medium w-full sm:w-auto"
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Contact Worker Now
                          </Button>
                          <span className="text-xs sm:text-sm text-orange-600 mt-1 sm:mt-0">
                            💡 Most issues can be resolved through direct communication
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Work Submission */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center">
                    <Eye className="mr-2 h-5 w-5 text-blue-600" />
                    Work Submission
                  </h4>

                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <h5 className="font-medium text-gray-900 mb-2">{proof.title}</h5>
                      <p className="text-gray-700 leading-relaxed">{proof.description}</p>
                    </CardContent>
                  </Card>
                </div>

                {userRole === "employer" && proof.status === "submitted" && (
                  <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <h4 className="text-base sm:text-lg font-semibold flex items-center">
                          <DollarSign className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          Payment Summary
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTipForm(!showTipForm)}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50 w-full sm:w-auto"
                        >
                          <Gift className="mr-1 h-4 w-4" />
                          Add Tip
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm sm:text-base">
                          <span className="text-gray-700">Base Payment:</span>
                          <span className="font-semibold text-lg">${proof.paymentAmount.toFixed(2)}</span>
                        </div>

                        {showTipForm && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 flex-1">
                              <Gift className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium">Tip Amount:</span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={tipAmount}
                                onChange={(e) => setTipAmount(e.target.value)}
                                className="flex-1 sm:w-24"
                                min="0"
                                step="0.01"
                              />
                              <span className="text-sm text-gray-600">USD</span>
                            </div>
                          </div>
                        )}

                        {tipAmount && Number.parseFloat(tipAmount) > 0 && (
                          <div className="flex justify-between items-center text-purple-600 text-sm sm:text-base">
                            <span>Tip Amount:</span>
                            <span className="font-semibold">+${Number.parseFloat(tipAmount).toFixed(2)}</span>
                          </div>
                        )}

                        <Separator />

                        <div className="flex justify-between items-center text-base sm:text-lg font-bold">
                          <span>Total Payment:</span>
                          <span className="text-green-600">${totalPayment.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {userRole === "employer" && proof.status === "submitted" && (
                  <div className="space-y-3">
                    {!showRejectForm && !showRevisionForm && !showReportForm && (
                      <div className="space-y-3">
                        <Button
                          onClick={handleApprove}
                          disabled={actionLoading === "approve"}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 text-base"
                        >
                          <Check className="mr-2 h-5 w-5" />
                          Approve & Pay ${totalPayment.toFixed(2)}
                        </Button>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {remainingRevisions > 0 && (
                            <Button
                              variant="outline"
                              onClick={() => setShowRevisionForm(true)}
                              className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 text-sm py-2"
                            >
                              <RotateCcw className="mr-1 h-4 w-4" />
                              <span className="hidden sm:inline">Request Changes ({remainingRevisions} left)</span>
                              <span className="sm:hidden">Changes ({remainingRevisions})</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => setShowRejectForm(true)}
                            className="text-red-600 border-red-300 hover:bg-red-50 text-sm py-2"
                          >
                            <X className="mr-1 h-4 w-4" />
                            <span className="hidden sm:inline">Reject Work</span>
                            <span className="sm:hidden">Reject</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowReportForm(true)}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50 text-sm py-2"
                          >
                            <Flag className="mr-1 h-4 w-4" />
                            <span className="hidden sm:inline">Report Admin</span>
                            <span className="sm:hidden">Report</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Revision Form */}
                    {showRevisionForm && (
                      <Card className="border-yellow-200 bg-yellow-50">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-yellow-800">Request Revision</h5>
                            <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                              {remainingRevisions} requests left
                            </Badge>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center text-sm text-blue-800">
                              <Clock className="mr-1 h-4 w-4" />
                              Worker will have{" "}
                              {formatTimeDisplay(
                                revisionSettings.revisionRequestTimeoutValue || 24,
                                revisionSettings.revisionRequestTimeoutUnit || "hours",
                              )}{" "}
                              to respond.
                              {revisionSettings.enableAutomaticRefunds &&
                                revisionSettings.refundOnRevisionTimeout &&
                                " Automatic refund will be processed if no response is received."}
                            </div>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div className="text-sm text-red-800">
                                <p className="font-semibold mb-1">⚠️ Important Guidelines:</p>
                                <ul className="space-y-1 text-xs">
                                  <li>• You can't ask revision if worker completed the work perfectly</li>
                                  <li>• You can't give extra work beyond the original requirements</li>
                                  <li>• Misuse may result in account suspension and penalties</li>
                                  <li>• Worker has options to revision/dispute/cancel if they disagree</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          <Textarea
                            placeholder="Explain what needs to be revised..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                            className="border-yellow-300"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleRequestRevision}
                              disabled={actionLoading === "revision" || remainingRevisions <= 0}
                              size="sm"
                              className="bg-yellow-600 hover:bg-yellow-700"
                            >
                              {remainingRevisions <= 0 ? "No Revisions Left" : "Send Revision Request"}
                            </Button>
                            <Button variant="outline" onClick={() => setShowRevisionForm(false)} size="sm">
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Rejection Form */}
                    {showRejectForm && (
                      <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4 space-y-3">
                          <h5 className="font-medium text-red-800">Reject Work</h5>
                          <p className="text-sm text-red-700">
                            Please explain why you're rejecting this work. The payment will be refunded.
                          </p>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center text-sm text-blue-800">
                              <Clock className="mr-1 h-4 w-4" />
                              Worker will have{" "}
                              {formatTimeDisplay(
                                revisionSettings.rejectionResponseTimeoutValue || 24,
                                revisionSettings.rejectionResponseTimeoutUnit || "hours",
                              )}{" "}
                              to respond.
                              {revisionSettings.enableAutomaticRefunds &&
                                revisionSettings.refundOnRejectionTimeout &&
                                " Automatic refund will be processed if no response is received."}
                            </div>
                          </div>
                          <Textarea
                            placeholder="Explain why you're rejecting this work..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={3}
                            className="border-red-300"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleReject}
                              disabled={actionLoading === "reject"}
                              variant="destructive"
                              size="sm"
                            >
                              Reject & Refund
                            </Button>
                            <Button variant="outline" onClick={() => setShowRejectForm(false)} size="sm">
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {showReportForm && (
                      <Card className="border-orange-200 bg-orange-50">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-orange-800 flex items-center">
                              <Flag className="mr-2 h-4 w-4" />
                              Report to Admin
                            </h5>
                            <Badge variant="outline" className="text-orange-700 border-orange-300">
                              Spam/Fake Work Report
                            </Badge>
                          </div>

                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div className="text-sm text-red-800">
                                <p className="font-semibold mb-1">⚠️ Important Notice:</p>
                                <p className="text-xs">
                                  Use this function only if the worker submitted completely fake work or is spamming.
                                  Admin will review this case and make decisions about money distribution and user
                                  suspension. False reports may result in penalties to your account.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Report Type</label>
                              <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full p-2 border border-orange-300 rounded-md text-sm"
                              >
                                <option value="fake_work">Completely Fake Work</option>
                                <option value="spam">Spam/Irrelevant Content</option>
                                <option value="inappropriate_content">Inappropriate Content</option>
                                <option value="not_delivered">Work Not Delivered as Described</option>
                                <option value="other">Other Serious Issue</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Detailed Explanation
                              </label>
                              <Textarea
                                placeholder="Explain in detail why you're reporting this work to admin. Be specific about what makes this fake work or spam..."
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                rows={4}
                                className="border-orange-300"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Additional Evidence (Optional)
                              </label>
                              <Textarea
                                placeholder="Provide any additional evidence, links, or context that supports your report..."
                                value={reportEvidence}
                                onChange={(e) => setReportEvidence(e.target.value)}
                                rows={2}
                                className="border-orange-300"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleReportAdmin}
                              disabled={actionLoading === "report"}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              <Flag className="mr-1 h-4 w-4" />
                              {actionLoading === "report" ? "Submitting..." : "Submit Report to Admin"}
                            </Button>
                            <Button variant="outline" onClick={() => setShowReportForm(false)} size="sm">
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="space-y-3">
              <h4 className="text-base sm:text-lg font-semibold flex items-center">
                <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Work Screenshots & Files
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {(() => {
                  const screenshots: string[] = []

                  console.log("[v0] Processing work proof screenshots:", proof.screenshots?.length || 0)

                  // Try to get screenshots from the screenshots array first
                  if (proof.screenshots && proof.screenshots.length > 0) {
                    proof.screenshots.forEach((screenshot, index) => {
                      console.log(
                        `[v0] Processing screenshot ${index}:`,
                        typeof screenshot,
                        screenshot?.substring?.(0, 50),
                      )

                      try {
                        let screenshotData = null

                        // Case 1: Direct base64 string
                        if (typeof screenshot === "string" && screenshot.startsWith("data:")) {
                          screenshotData = screenshot
                          console.log(`[v0] Screenshot ${index}: Direct base64`)
                        }
                        // Case 2: JSON string with data property
                        else if (typeof screenshot === "string" && screenshot.includes("{")) {
                          const parsed = JSON.parse(screenshot)
                          if (parsed.data && parsed.data.startsWith("data:")) {
                            screenshotData = parsed.data
                            console.log(`[v0] Screenshot ${index}: Parsed from JSON`)
                          }
                        }
                        // Case 3: Object with data property
                        else if (typeof screenshot === "object" && screenshot?.data?.startsWith?.("data:")) {
                          screenshotData = screenshot.data
                          console.log(`[v0] Screenshot ${index}: Object with data`)
                        }
                        // Case 4: Try as direct string (fallback)
                        else if (typeof screenshot === "string" && screenshot.length > 100) {
                          screenshotData = screenshot.startsWith("data:")
                            ? screenshot
                            : `data:image/png;base64,${screenshot}`
                          console.log(`[v0] Screenshot ${index}: Fallback processing`)
                        }

                        if (screenshotData && screenshotData.startsWith("data:")) {
                          screenshots.push(screenshotData)
                        } else {
                          console.warn(`[v0] Invalid screenshot data for ${index}:`, typeof screenshot)
                        }
                      } catch (error) {
                        console.error(`[v0] Failed to parse screenshot ${index}:`, error)
                      }
                    })
                  }

                  // If no screenshots found, try proofFiles as fallback
                  if (screenshots.length === 0 && proof.proofFiles && proof.proofFiles.length > 0) {
                    console.log("[v0] No screenshots found, trying proofFiles as fallback")
                    proof.proofFiles.forEach((file, index) => {
                      try {
                        let fileData = null

                        // Similar processing for proof files
                        if (typeof file === "string" && file.startsWith("data:")) {
                          fileData = file
                        } else if (typeof file === "string" && file.includes("{")) {
                          const parsed = JSON.parse(file)
                          if (parsed.data && parsed.data.startsWith("data:") && parsed.type?.startsWith("image/")) {
                            fileData = parsed.data
                          }
                        } else if (
                          typeof file === "object" &&
                          file?.data?.startsWith?.("data:") &&
                          file?.type?.startsWith?.("image/")
                        ) {
                          fileData = file.data
                        }

                        if (fileData && fileData.startsWith("data:")) {
                          screenshots.push(fileData)
                        }
                      } catch (error) {
                        console.error(`[v0] Failed to parse proof file ${index}:`, error)
                      }
                    })
                  }

                  console.log(`[v0] Final processed screenshots count: ${screenshots.length}`)

                  return screenshots.length > 0 ? (
                    screenshots.map((screenshot, index) => (
                      <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-video bg-gray-100 flex items-center justify-center">
                          <img
                            src={screenshot || "/placeholder.svg"}
                            alt={`Work Screenshot ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => handleViewScreenshot(screenshot)}
                            onError={(e) => {
                              console.error(`[v0] Failed to load screenshot ${index + 1}`)
                              e.currentTarget.src = "/placeholder.svg?height=200&width=300&text=Failed+to+Load"
                            }}
                          />
                        </div>
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium">Screenshot {index + 1}</span>
                            <Button size="sm" variant="outline" onClick={() => handleViewScreenshot(screenshot)}>
                              <Eye className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full">
                      <Card className="border-dashed border-2 border-gray-300">
                        <CardContent className="p-6 sm:p-8 text-center">
                          <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 text-sm sm:text-base">No screenshots provided</p>
                          <p className="text-gray-400 text-xs sm:text-sm mt-1">
                            Screenshots will appear here when uploaded
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Screenshot Modal for Full-Screen Viewing */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedScreenshot && (
              <img
                src={selectedScreenshot || "/placeholder.svg"}
                alt="Full size screenshot"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Form Modal */}
      <ReviewForm
        isOpen={showReviewForm}
        onClose={handleReviewClose}
        onSubmit={handleReviewSubmit}
        jobId={proof.jobId}
        workProofId={proof.id}
        reviewerId={proof.employerId}
        revieweeId={proof.workerId}
        workerName={`${proof.worker.firstName} ${proof.worker.lastName}`}
      />
    </>
  )
}
