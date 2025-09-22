"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Search,
  Clock,
  Eye,
  ShoppingCart,
  Package,
  CreditCard,
  AlertTriangle,
  FileText,
  ImageIcon,
  X,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { getAdminDisputes, resolveDispute } from "@/lib/admin-disputes"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MarketplaceDispute {
  id: string
  orderId: string
  productTitle: string
  buyerName: string
  sellerName: string
  disputeType: "product_quality" | "delivery_issue" | "payment_dispute" | "refund_request" | "other"
  status: "pending" | "under_review" | "resolved" | "escalated"
  priority: "low" | "medium" | "high" | "urgent"
  amount: number
  reason: string
  description: string
  createdAt: string
  updatedAt: string
  evidence?: string[]
  adminNotes?: string
  createdBy?: "buyer" | "seller"
  resolvedBy?: string
  resolutionDecision?: string
  resolutionDate?: string
}

export default function MarketplaceDisputesPage() {
  const [disputes, setDisputes] = useState<MarketplaceDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedDispute, setSelectedDispute] = useState<MarketplaceDispute | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showResolutionDialog, setShowResolutionDialog] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [resolutionDecision, setResolutionDecision] = useState("")
  const [isResolving, setIsResolving] = useState(false)

  const [viewingFile, setViewingFile] = useState<{
    name: string
    url: string
    type: string
  } | null>(null)

  const handleViewFile = (file: any, index: number) => {
    console.log("[v0] Viewing evidence file:", file)

    let fileUrl = ""
    let fileName = ""
    let fileType = ""

    if (typeof file === "string") {
      fileName = file
      fileType = "document"
      // For string filenames, we can't view the actual file
      alert(
        `File: ${fileName}\n\nNote: This is a filename reference only. The actual file content is not available for viewing in this demo.`,
      )
      return
    } else if (file?.name) {
      fileName = file.name
      fileType = file.type || "document"
      fileUrl = file.url || file.preview || ""
    } else {
      fileName = `Evidence ${index + 1}`
      fileType = "document"
    }

    if (fileUrl && fileUrl.startsWith("blob:")) {
      // For blob URLs, we can display the file
      setViewingFile({
        name: fileName,
        url: fileUrl,
        type: fileType,
      })
    } else {
      alert(
        `File: ${fileName}\nType: ${fileType}\n\nNote: File content is not available for viewing. In a production environment, this would download or display the file from cloud storage.`,
      )
    }
  }

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "admin_disputes_mock_data" || e.key === "admin_actions") {
        console.log(`[v0] Storage change detected, refreshing marketplace disputes`)
        loadMarketplaceDisputes()
      }
    }

    const handleDisputeResolved = (e: CustomEvent) => {
      console.log(`[v0] Dispute resolved event detected, refreshing marketplace disputes`, e.detail)
      loadMarketplaceDisputes()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("disputeResolved", handleDisputeResolved as EventListener)

    const handleFocus = () => {
      console.log(`[v0] Window focus detected, refreshing marketplace disputes`)
      loadMarketplaceDisputes()
    }

    window.addEventListener("focus", handleFocus)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("disputeResolved", handleDisputeResolved as EventListener)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  useEffect(() => {
    loadMarketplaceDisputes()
  }, [searchQuery, statusFilter, priorityFilter, typeFilter])

  const loadMarketplaceDisputes = async () => {
    setLoading(true)
    try {
      console.log(`[v0] Loading marketplace disputes with filters:`, {
        searchQuery,
        statusFilter,
        priorityFilter,
        typeFilter,
      })

      const filters: any = {
        platform: "marketplace", // Filter for marketplace platform only
      }
      if (searchQuery) filters.search = searchQuery
      if (statusFilter !== "all") filters.status = statusFilter
      if (priorityFilter !== "all") filters.priority = priorityFilter

      const disputesData = await getAdminDisputes(filters)

      const marketplaceDisputes: MarketplaceDispute[] = disputesData.map((dispute) => ({
        id: dispute.id,
        orderId: dispute.jobId,
        productTitle: dispute.jobTitle,
        buyerName: dispute.employerName,
        sellerName: dispute.workerName,
        disputeType: "other" as const,
        status: dispute.status as any,
        priority: dispute.priority as any,
        amount: dispute.amount,
        reason: dispute.reason,
        description: dispute.description,
        createdAt: dispute.createdAt,
        updatedAt: dispute.updatedAt,
        evidence: dispute.evidence || [], // Map evidence files from dispute data
        adminNotes: dispute.adminNotes,
        createdBy: dispute.createdBy as "buyer" | "seller",
        resolvedBy: dispute.resolvedBy,
        resolutionDecision: dispute.resolutionDecision,
        resolutionDate: dispute.resolutionDate,
      }))

      setDisputes(marketplaceDisputes)
      console.log(`[v0] Loaded ${marketplaceDisputes.length} marketplace disputes`)
    } catch (error) {
      console.error("Failed to load marketplace disputes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolutionDecision || !resolutionNotes.trim()) {
      alert("Please provide resolution decision and notes")
      return
    }

    if (isResolving) {
      console.log("[v0] Resolution already in progress, ignoring duplicate request")
      return
    }

    setIsResolving(true)

    try {
      console.log(`[v0] Resolving marketplace dispute: ${selectedDispute.id} with decision: ${resolutionDecision}`)

      let adminDecision: "approve_worker" | "approve_employer" | "partial_refund"
      if (resolutionDecision === "approve_seller_no_refund") {
        adminDecision = "approve_worker"
      } else if (resolutionDecision === "approve_buyer_full_refund") {
        adminDecision = "approve_employer"
      } else {
        adminDecision = "partial_refund"
      }

      await resolveDispute(selectedDispute.id, {
        decision: adminDecision,
        adminNotes: resolutionNotes,
        adminId: "current-admin",
      })

      try {
        const { marketplaceOrderManager } = await import("@/lib/marketplace-orders")

        let marketplaceDecision: "refund_buyer" | "pay_seller" | "partial_refund"
        if (resolutionDecision === "approve_seller_no_refund") {
          marketplaceDecision = "pay_seller"
        } else if (resolutionDecision === "approve_buyer_full_refund") {
          marketplaceDecision = "refund_buyer"
        } else {
          marketplaceDecision = "partial_refund"
        }

        const success = marketplaceOrderManager.resolveDispute(
          selectedDispute.orderId,
          "current-admin",
          marketplaceDecision,
          resolutionNotes,
        )

        if (success) {
          console.log(`[v0] Successfully synced with marketplace orders system`)
        }
      } catch (syncError) {
        console.error(`[v0] Error syncing with marketplace orders:`, syncError)
      }

      await loadMarketplaceDisputes()
      setShowResolutionDialog(false)
      setSelectedDispute(null)
      setResolutionNotes("")
      setResolutionDecision("")
      alert("Marketplace dispute resolved successfully!")
    } catch (error) {
      console.error("Failed to resolve marketplace dispute:", error)
      if (error instanceof Error && error.message.includes("already")) {
        alert("This dispute has already been resolved or is being processed.")
      } else {
        alert("Failed to resolve dispute. Please try again.")
      }
    } finally {
      setIsResolving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      under_review: "bg-blue-100 text-blue-800 border-blue-200",
      resolved: "bg-green-100 text-green-800 border-green-200",
      escalated: "bg-red-100 text-red-800 border-red-200",
    }
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: "bg-gray-100 text-gray-800 border-gray-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      urgent: "bg-red-100 text-red-800 border-red-200",
    }
    return variants[priority as keyof typeof variants] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      product_quality: "bg-purple-100 text-purple-800 border-purple-200",
      delivery_issue: "bg-orange-100 text-orange-800 border-orange-200",
      payment_dispute: "bg-red-100 text-red-800 border-red-200",
      refund_request: "bg-blue-100 text-blue-800 border-blue-200",
      other: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return variants[type as keyof typeof variants] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.orderId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter
    const matchesPriority = priorityFilter === "all" || dispute.priority === priorityFilter
    const matchesType = typeFilter === "all" || dispute.disputeType === typeFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesType
  })

  return (
    <>
      <AdminHeader title="Marketplace Disputes" description="Manage and resolve marketplace order disputes" />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Marketplace Disputes</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold">{disputes.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Pending Review</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                  {disputes.filter((d) => d.status === "pending" || d.status === "under_review").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Resolved Today</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {
                    disputes.filter(
                      (d) =>
                        d.status === "resolved" && new Date(d.updatedAt).toDateString() === new Date().toDateString(),
                    ).length
                  }
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">High Priority</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold text-red-600">
                  {disputes.filter((d) => d.priority === "high" || d.priority === "urgent").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Amount</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  ${disputes.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search marketplace disputes by product, buyer, seller, or order ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="product_quality">Product Quality</SelectItem>
                    <SelectItem value="delivery_issue">Delivery Issue</SelectItem>
                    <SelectItem value="payment_dispute">Payment Dispute</SelectItem>
                    <SelectItem value="refund_request">Refund Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadMarketplaceDisputes}>Refresh</Button>
              </div>
            </CardContent>
          </Card>

          {/* Disputes List */}
          <Tabs
            value={statusFilter === "all" ? "all" : statusFilter}
            onValueChange={setStatusFilter}
            className="space-y-6"
          >
            <TabsList>
              <TabsTrigger value="all">All Disputes ({filteredDisputes.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="under_review">Under Review</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter === "all" ? "all" : statusFilter}>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : filteredDisputes.length > 0 ? (
                <div className="space-y-4">
                  {filteredDisputes.map((dispute) => (
                    <Card key={dispute.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start justify-between space-y-4 sm:space-y-0">
                          <div className="flex-1 space-y-3 w-full">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                                {dispute.productTitle}
                              </h3>
                              <Badge className={`${getStatusBadge(dispute.status)} border text-xs`}>
                                {dispute.status}
                              </Badge>
                              <Badge className={`${getPriorityBadge(dispute.priority)} border text-xs`}>
                                {dispute.priority}
                              </Badge>
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                Marketplace
                              </Badge>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>Order: {dispute.orderId}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                                  <AvatarFallback className="text-xs">{dispute.buyerName[0]}</AvatarFallback>
                                </Avatar>
                                <span>Buyer: {dispute.buyerName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                                  <AvatarFallback className="text-xs">{dispute.sellerName[0]}</AvatarFallback>
                                </Avatar>
                                <span>Seller: {dispute.sellerName}</span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Badge
                                  className={
                                    dispute.createdBy === "buyer"
                                      ? "bg-blue-100 text-blue-800 text-xs"
                                      : "bg-purple-100 text-purple-800 text-xs"
                                  }
                                >
                                  Created by {dispute.createdBy}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>${dispute.amount}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: true })}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm text-gray-700">
                                <strong>Reason:</strong> {dispute.reason}
                              </p>
                              {dispute.description && <p className="text-sm text-gray-600">{dispute.description}</p>}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto text-xs sm:text-sm bg-transparent"
                              onClick={() => {
                                setSelectedDispute(dispute)
                                setShowDetailsDialog(true)
                              }}
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              View Details
                            </Button>
                            {dispute.status !== "resolved" && (
                              <Button
                                size="sm"
                                className="w-full sm:w-auto text-xs sm:text-sm"
                                onClick={() => {
                                  setSelectedDispute(dispute)
                                  setShowResolutionDialog(true)
                                }}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Marketplace Disputes Found</h3>
                    <p className="text-gray-600">
                      {searchQuery || statusFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all"
                        ? "Try adjusting your search criteria or filters."
                        : "All marketplace disputes have been resolved or there are no disputes to review."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Resolution Dialog */}
      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Resolve Marketplace Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedDispute && (
              <div className="space-y-4">
                <div className="space-y-4 border-b pb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dispute Reason</label>
                    <p className="text-sm">{selectedDispute.reason}</p>
                  </div>
                  {selectedDispute.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Details</label>
                      <p className="text-sm bg-red-50 p-3 rounded mt-1">{selectedDispute.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Resolution Decision (Required)</label>
                    <Select value={resolutionDecision} onValueChange={setResolutionDecision}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your decision..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approve_buyer_full_refund">Approve Buyer - Full Refund</SelectItem>
                        <SelectItem value="approve_seller_no_refund">Approve Seller - Seller Gets Paid</SelectItem>
                        <SelectItem value="partial_refund_50_50">Partial Refund - 50/50 Split</SelectItem>
                        <SelectItem value="partial_refund_custom">Partial Refund - Custom Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Admin Decision Notes (Required)</label>
                    <Textarea
                      placeholder="Explain your decision, evidence reviewed, and reasoning..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Payment Breakdown Preview
                    </h4>
                    <div className="space-y-3 text-sm">
                      {resolutionDecision === "approve_buyer_full_refund" && (
                        <div className="bg-white p-3 rounded border border-blue-300">
                          <p className="font-medium text-blue-800 mb-2">If Refund Buyer:</p>
                          <p className="text-blue-700">• Buyer receives: ${selectedDispute.amount.toFixed(2)}</p>
                          <p className="text-blue-700">• Seller receives: $0.00</p>
                          <p className="text-blue-700">• Platform fee: $0.00</p>
                        </div>
                      )}
                      {resolutionDecision === "approve_seller_no_refund" && (
                        <div className="bg-white p-3 rounded border border-blue-300">
                          <p className="font-medium text-blue-800 mb-2">Approve Seller (Seller Gets Paid):</p>
                          <p className="text-blue-700">• Buyer receives: $0.00</p>
                          <p className="text-blue-700">
                            • Seller receives: ${(selectedDispute.amount * 0.95).toFixed(2)}
                          </p>
                          <p className="text-blue-700">• Platform fee: ${(selectedDispute.amount * 0.05).toFixed(2)}</p>
                        </div>
                      )}
                      {(resolutionDecision === "partial_refund_50_50" ||
                        resolutionDecision === "partial_refund_custom") && (
                        <div className="bg-white p-3 rounded border border-blue-300">
                          <p className="font-medium text-blue-800 mb-2">Partial Refund (50/50 Split):</p>
                          <p className="text-blue-700">
                            • Buyer receives: ${(selectedDispute.amount * 0.5).toFixed(2)}
                          </p>
                          <p className="text-blue-700">
                            • Seller receives: ${(selectedDispute.amount * 0.45).toFixed(2)}
                          </p>
                          <p className="text-blue-700">• Platform fee: ${(selectedDispute.amount * 0.05).toFixed(2)}</p>
                        </div>
                      )}
                      {!resolutionDecision && (
                        <p className="text-blue-600 italic">Select a resolution decision to see payment breakdown</p>
                      )}
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Choose your decision carefully. This action will be logged in the admin audit trail and cannot be
                      undone.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={() => setShowResolutionDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleResolveDispute}
                      disabled={isResolving || !resolutionNotes.trim() || !resolutionDecision}
                    >
                      {isResolving ? "Resolving..." : "Resolve Dispute"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Order Information</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <strong>Product:</strong> {selectedDispute.productTitle}
                      </p>
                      <p>
                        <strong>Order ID:</strong> {selectedDispute.orderId}
                      </p>
                      <p>
                        <strong>Amount:</strong> ${selectedDispute.amount.toFixed(2)}
                      </p>
                      <p>
                        <strong>Status:</strong>
                        <Badge className={`ml-2 ${getStatusBadge(selectedDispute.status)}`}>
                          {selectedDispute.status}
                        </Badge>
                      </p>
                      <p>
                        <strong>Priority:</strong>
                        <Badge className={`ml-2 ${getPriorityBadge(selectedDispute.priority)}`}>
                          {selectedDispute.priority}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Parties Involved</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{selectedDispute.buyerName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{selectedDispute.buyerName}</p>
                          <p className="text-xs text-gray-500">Buyer</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{selectedDispute.sellerName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{selectedDispute.sellerName}</p>
                          <p className="text-xs text-gray-500">Seller</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Badge
                          className={
                            selectedDispute.createdBy === "buyer"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }
                        >
                          Dispute created by {selectedDispute.createdBy}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div>
                  <h4 className="font-medium text-gray-900">Dispute Information</h4>
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reason:</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedDispute.reason}</p>
                    </div>
                    {selectedDispute.description && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Details:</p>
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded">
                          {selectedDispute.description}
                        </p>
                      </div>
                    )}

                    {selectedDispute.evidence && selectedDispute.evidence.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Evidence Files ({selectedDispute.evidence.length}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedDispute.evidence.map((file, index) => {
                            const fileName =
                              typeof file === "string" ? file : file?.name || file?.filename || `Evidence ${index + 1}`
                            const isImage =
                              typeof fileName === "string" &&
                              (fileName.toLowerCase().includes("image") ||
                                fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i))
                            return (
                              <Card key={index} className="border border-gray-200">
                                <CardContent className="p-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                      {isImage ? (
                                        <div className="w-12 h-12 bg-blue-50 rounded flex items-center justify-center">
                                          <ImageIcon className="h-6 w-6 text-blue-600" />
                                        </div>
                                      ) : (
                                        <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center">
                                          <FileText className="h-6 w-6 text-gray-600" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                                      <p className="text-xs text-gray-500">
                                        {isImage ? "Image file" : "Document file"}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title="View evidence"
                                      onClick={() => handleViewFile(file, index)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-700">
                            <strong>Note:</strong> Evidence files were uploaded by the {selectedDispute.createdBy} to
                            support their dispute claim.
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-gray-700">Created:</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(selectedDispute.createdAt).toLocaleString()} (
                        {formatDistanceToNow(new Date(selectedDispute.createdAt), { addSuffix: true })})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedDispute.status === "resolved" && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Resolution Details</h4>
                    <div className="mt-2 space-y-3">
                      {selectedDispute.resolutionDecision && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Admin Decision:</p>
                          <Badge className="mt-1 bg-green-100 text-green-800">
                            {selectedDispute.resolutionDecision === "approve_employer"
                              ? "APPROVED BUYER"
                              : selectedDispute.resolutionDecision === "approve_worker"
                                ? "APPROVED SELLER"
                                : selectedDispute.resolutionDecision.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                        </div>
                      )}
                      {selectedDispute.adminNotes && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Admin Notes:</p>
                          <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded">
                            {selectedDispute.adminNotes}
                          </p>
                        </div>
                      )}
                      {selectedDispute.resolvedBy && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Resolved by:</p>
                          <p className="text-sm text-gray-600 mt-1">{selectedDispute.resolvedBy}</p>
                        </div>
                      )}
                      {selectedDispute.resolutionDate && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Resolution Date:</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(selectedDispute.resolutionDate).toLocaleString()} (
                            {formatDistanceToNow(new Date(selectedDispute.resolutionDate), { addSuffix: true })})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 border-t pt-4">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                {selectedDispute.status !== "resolved" && (
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false)
                      setShowResolutionDialog(true)
                    }}
                  >
                    Resolve Dispute
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{viewingFile.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewingFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {viewingFile.type.startsWith("image/") ? (
              <img
                src={viewingFile.url || "/placeholder.svg"}
                alt={viewingFile.name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Cannot preview this file type in browser</p>
                <Button
                  onClick={() => {
                    const link = document.createElement("a")
                    link.href = viewingFile.url
                    link.download = viewingFile.name
                    link.click()
                  }}
                >
                  Download File
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
