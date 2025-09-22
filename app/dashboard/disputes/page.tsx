"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Clock, CheckCircle, Plus, Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { getAdminDisputes, createAdminDispute, type AdminDispute } from "@/lib/admin-disputes"
import { marketplaceOrderManager, type MarketplaceOrder } from "@/lib/marketplace-orders"

export default function DisputesPage() {
  const { user } = useAuth()
  const [disputes, setDisputes] = useState<AdminDispute[]>([])
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null)
  const [disputeReason, setDisputeReason] = useState("")
  const [disputeDescription, setDisputeDescription] = useState("")
  const [disputePriority, setDisputePriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (user) {
      loadDisputes()
      loadOrders()
    }
  }, [user])

  const loadDisputes = async () => {
    try {
      const allDisputes = await getAdminDisputes()
      // Filter disputes where user is either worker or employer
      const userDisputes = allDisputes.filter(
        (dispute) => dispute.workerId === user?.id || dispute.employerId === user?.id,
      )
      setDisputes(userDisputes)
    } catch (error) {
      console.error("Error loading disputes:", error)
    }
  }

  const loadOrders = () => {
    try {
      const userOrders = marketplaceOrderManager.getOrdersByUser(user?.id || "", "buyer")
      const sellerOrders = marketplaceOrderManager.getOrdersByUser(user?.id || "", "seller")
      const allUserOrders = [...userOrders, ...sellerOrders]

      // Filter orders that can have disputes opened (delivered status)
      const disputeEligibleOrders = allUserOrders.filter(
        (order) => order.status === "delivered" || order.status === "disputed",
      )
      setOrders(disputeEligibleOrders)
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDispute = async () => {
    if (!selectedOrder || !disputeReason.trim() || !disputeDescription.trim() || !user) {
      alert("Please fill in all required fields")
      return
    }

    setCreating(true)
    try {
      const isBuyer = selectedOrder.buyerId === user.id
      const disputeData = {
        jobId: selectedOrder.id,
        workProofId: `proof_${selectedOrder.id}`,
        workerId: selectedOrder.sellerId,
        employerId: selectedOrder.buyerId,
        jobTitle: selectedOrder.serviceName,
        workerName: selectedOrder.sellerId, // In real app, get actual names
        employerName: selectedOrder.buyerId,
        amount: selectedOrder.price,
        reason: disputeReason,
        description: disputeDescription,
        requestedAction: isBuyer ? "refund" : "payment",
        priority: disputePriority,
        evidenceCount: 0,
      }

      await createAdminDispute(disputeData)

      // Also update the order status to disputed
      if (isBuyer) {
        marketplaceOrderManager.openDispute(selectedOrder.id, user.id, disputeReason, disputeDescription)
      }

      await loadDisputes()
      loadOrders()
      setShowCreateDialog(false)
      setSelectedOrder(null)
      setDisputeReason("")
      setDisputeDescription("")
      setDisputePriority("medium")

      alert("Dispute created successfully! An admin will review your case.")
    } catch (error) {
      console.error("Error creating dispute:", error)
      if (error instanceof Error && error.message.includes("already exists")) {
        alert("A dispute for this order already exists and is pending resolution.")
      } else {
        alert("Failed to create dispute. Please try again.")
      }
    } finally {
      setCreating(false)
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

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.reason.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <DashboardHeader title="Disputes" description="Manage your disputes and resolve issues with orders" />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{disputes.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {disputes.filter((d) => d.status === "pending" || d.status === "under_review").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {disputes.filter((d) => d.status === "resolved").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Available Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {orders.filter((o) => o.status === "delivered").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search disputes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
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
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Dispute
            </Button>
          </div>

          {/* Disputes List */}
          {filteredDisputes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Disputes Found</h3>
                <p className="text-gray-600 mb-6">
                  {disputes.length === 0
                    ? "You haven't created any disputes yet. If you have issues with an order, you can create a dispute."
                    : "No disputes match your current filters."}
                </p>
                {orders.filter((o) => o.status === "delivered").length > 0 && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Dispute
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDisputes.map((dispute) => (
                <Card key={dispute.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">{dispute.jobTitle}</h3>
                          <Badge className={`${getStatusBadge(dispute.status)} border`}>{dispute.status}</Badge>
                          <Badge className={`${getPriorityBadge(dispute.priority)} border`}>{dispute.priority}</Badge>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: true })}</span>
                          </div>
                          <span>Amount: ${dispute.amount.toFixed(2)}</span>
                          <span>Role: {dispute.workerId === user?.id ? "Seller" : "Buyer"}</span>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-gray-700">
                            <strong>Reason:</strong> {dispute.reason}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">{dispute.description}</p>
                        </div>

                        {dispute.status === "resolved" && dispute.resolution && (
                          <div className="mt-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-green-800 flex items-center">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Dispute Resolved
                              </h4>
                              <span className="text-sm text-green-600">
                                {formatDistanceToNow(new Date(dispute.updatedAt), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-700">Admin Decision:</span>
                                <Badge className="bg-green-200 text-green-900 border-green-400">
                                  {dispute.resolution === "approve_worker" && "Worker Approved"}
                                  {dispute.resolution === "approve_employer" && "Employer Refunded"}
                                  {dispute.resolution === "partial_refund" && "Partial Resolution"}
                                </Badge>
                              </div>
                              {dispute.adminNotes && (
                                <p className="text-sm text-green-800 bg-green-25 p-2 rounded border-l-4 border-green-400">
                                  {dispute.adminNotes}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Dispute Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select Order</label>
              <Select
                value={selectedOrder?.id || ""}
                onValueChange={(value) => {
                  const order = orders.find((o) => o.id === value)
                  setSelectedOrder(order || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an order to dispute..." />
                </SelectTrigger>
                <SelectContent>
                  {orders
                    .filter((o) => o.status === "delivered")
                    .map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.serviceName} - ${order.price} ({order.buyerId === user?.id ? "As Buyer" : "As Seller"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {orders.filter((o) => o.status === "delivered").length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No delivered orders available for dispute. Only delivered orders can be disputed.
                </p>
              )}
            </div>

            {selectedOrder && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Order Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Service:</span>
                      <span className="ml-2 font-medium">{selectedOrder.serviceName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <span className="ml-2 font-medium">${selectedOrder.price}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Your Role:</span>
                      <span className="ml-2 font-medium">
                        {selectedOrder.buyerId === user?.id ? "Buyer" : "Seller"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 font-medium">{selectedOrder.status}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Dispute Reason</label>
                  <Select value={disputeReason} onValueChange={setDisputeReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason for dispute..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work_quality">Work Quality Issues</SelectItem>
                      <SelectItem value="incomplete_delivery">Incomplete Delivery</SelectItem>
                      <SelectItem value="not_as_described">Not as Described</SelectItem>
                      <SelectItem value="communication_issues">Communication Issues</SelectItem>
                      <SelectItem value="late_delivery">Late Delivery</SelectItem>
                      <SelectItem value="payment_issues">Payment Issues</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority Level</label>
                  <Select value={disputePriority} onValueChange={(value: any) => setDisputePriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Minor issue</SelectItem>
                      <SelectItem value="medium">Medium - Standard issue</SelectItem>
                      <SelectItem value="high">High - Significant issue</SelectItem>
                      <SelectItem value="urgent">Urgent - Critical issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Detailed Description</label>
                  <Textarea
                    placeholder="Please provide a detailed explanation of the issue, including what went wrong, what you expected, and what resolution you're seeking..."
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    rows={5}
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Creating a dispute will notify the admin team for review. Please ensure you've tried to resolve the
                    issue directly with the other party first.
                  </AlertDescription>
                </Alert>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false)
                  setSelectedOrder(null)
                  setDisputeReason("")
                  setDisputeDescription("")
                  setDisputePriority("medium")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDispute}
                disabled={!selectedOrder || !disputeReason || !disputeDescription.trim() || creating}
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Create Dispute
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
