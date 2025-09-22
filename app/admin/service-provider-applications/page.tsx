"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  User,
  Mail,
  Calendar,
  Star,
  Eye,
  UserCheck,
  Info,
} from "lucide-react"

interface ServiceProviderApplication {
  id: string
  user_id: string
  full_name: string
  email: string
  phone?: string
  skills: string[]
  experience_years: number
  education?: string
  certifications: string[]
  portfolio_links: string[]
  work_samples: string[]
  fiverr_profile?: string
  upwork_profile?: string
  peopleperhour_profile?: string
  legiit_profile?: string
  status: "pending" | "under_review" | "approved" | "rejected" | "needs_more_info"
  admin_notes?: string
  reviewed_by?: string
  reviewed_at?: string
  additional_info_requested?: string
  additional_info_provided?: string
  created_at: string
  updated_at: string
  username?: string
  user_email?: string
}

export default function ServiceProviderApplicationsPage() {
  const [applications, setApplications] = useState<ServiceProviderApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<ServiceProviderApplication | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [additionalInfoRequest, setAdditionalInfoRequest] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/admin/service-provider-applications")
      const data = await response.json()
      setApplications(data.applications || [])
    } catch (error) {
      console.error("Error fetching applications:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (
    applicationId: string,
    status: string,
    notes?: string,
    additionalInfo?: string,
  ) => {
    try {
      const response = await fetch(`/api/admin/service-provider-applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          admin_notes: notes,
          additional_info_requested: additionalInfo,
        }),
      })

      if (response.ok) {
        fetchApplications()
        setSelectedApplication(null)
        setReviewNotes("")
        setAdditionalInfoRequest("")
      }
    } catch (error) {
      console.error("Error updating application:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "under_review":
        return (
          <Badge variant="default">
            <Eye className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case "needs_more_info":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Info
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredApplications = applications.filter((app) => statusFilter === "all" || app.status === statusFilter)

  const getStatusCounts = () => {
    return {
      all: applications.length,
      pending: applications.filter((app) => app.status === "pending").length,
      under_review: applications.filter((app) => app.status === "under_review").length,
      approved: applications.filter((app) => app.status === "approved").length,
      rejected: applications.filter((app) => app.status === "rejected").length,
      needs_more_info: applications.filter((app) => app.status === "needs_more_info").length,
    }
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Provider Applications</h1>
          <p className="text-gray-600">Review and manage service provider applications</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <UserCheck className="h-3 w-3" />
            {statusCounts.pending} Pending Review
          </Badge>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{statusCounts.all}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter("pending")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter("under_review")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.under_review}</div>
            <div className="text-sm text-gray-600">Under Review</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter("approved")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter("rejected")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter("needs_more_info")}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.needs_more_info}</div>
            <div className="text-sm text-gray-600">Needs Info</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {filteredApplications.length} applications {statusFilter !== "all" && `with status: ${statusFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <div key={application.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{application.full_name}</h3>
                      {getStatusBadge(application.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {application.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        {application.experience_years} years exp.
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(application.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />@{application.username}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {application.skills.slice(0, 5).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {application.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{application.skills.length - 5} more
                        </Badge>
                      )}
                    </div>

                    {/* External Platform Links */}
                    <div className="flex gap-2 mb-3">
                      {application.fiverr_profile && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Fiverr
                        </Badge>
                      )}
                      {application.upwork_profile && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Upwork
                        </Badge>
                      )}
                      {application.peopleperhour_profile && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          PeoplePerHour
                        </Badge>
                      )}
                      {application.legiit_profile && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Legiit
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedApplication(application)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Review Application - {application.full_name}</DialogTitle>
                          <DialogDescription>
                            Submitted on {new Date(application.created_at).toLocaleDateString()}
                          </DialogDescription>
                        </DialogHeader>

                        {selectedApplication && (
                          <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="details">Details</TabsTrigger>
                              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                              <TabsTrigger value="review">Review</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Full Name</Label>
                                  <div className="p-2 bg-gray-50 rounded">{selectedApplication.full_name}</div>
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <div className="p-2 bg-gray-50 rounded">{selectedApplication.email}</div>
                                </div>
                                <div>
                                  <Label>Phone</Label>
                                  <div className="p-2 bg-gray-50 rounded">
                                    {selectedApplication.phone || "Not provided"}
                                  </div>
                                </div>
                                <div>
                                  <Label>Experience</Label>
                                  <div className="p-2 bg-gray-50 rounded">
                                    {selectedApplication.experience_years} years
                                  </div>
                                </div>
                              </div>

                              <div>
                                <Label>Skills</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedApplication.skills.map((skill) => (
                                    <Badge key={skill} variant="secondary">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Label>Education</Label>
                                <div className="p-2 bg-gray-50 rounded">
                                  {selectedApplication.education || "Not provided"}
                                </div>
                              </div>

                              <div>
                                <Label>Certifications</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedApplication.certifications.map((cert) => (
                                    <Badge key={cert} variant="outline">
                                      {cert}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="portfolio" className="space-y-4">
                              <div>
                                <Label>Portfolio Links</Label>
                                <div className="space-y-2 mt-2">
                                  {selectedApplication.portfolio_links.map((link, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                      <ExternalLink className="h-4 w-4 text-gray-400" />
                                      <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                      >
                                        {link}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Label>Work Samples</Label>
                                <div className="space-y-2 mt-2">
                                  {selectedApplication.work_samples.map((sample, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                      <ExternalLink className="h-4 w-4 text-gray-400" />
                                      <a
                                        href={sample}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                      >
                                        {sample}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Label>External Platform Profiles</Label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  {selectedApplication.fiverr_profile && (
                                    <div>
                                      <Label className="text-sm">Fiverr</Label>
                                      <a
                                        href={selectedApplication.fiverr_profile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-blue-600 hover:underline text-sm"
                                      >
                                        {selectedApplication.fiverr_profile}
                                      </a>
                                    </div>
                                  )}
                                  {selectedApplication.upwork_profile && (
                                    <div>
                                      <Label className="text-sm">Upwork</Label>
                                      <a
                                        href={selectedApplication.upwork_profile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-blue-600 hover:underline text-sm"
                                      >
                                        {selectedApplication.upwork_profile}
                                      </a>
                                    </div>
                                  )}
                                  {selectedApplication.peopleperhour_profile && (
                                    <div>
                                      <Label className="text-sm">PeoplePerHour</Label>
                                      <a
                                        href={selectedApplication.peopleperhour_profile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-blue-600 hover:underline text-sm"
                                      >
                                        {selectedApplication.peopleperhour_profile}
                                      </a>
                                    </div>
                                  )}
                                  {selectedApplication.legiit_profile && (
                                    <div>
                                      <Label className="text-sm">Legiit</Label>
                                      <a
                                        href={selectedApplication.legiit_profile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-blue-600 hover:underline text-sm"
                                      >
                                        {selectedApplication.legiit_profile}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="review" className="space-y-4">
                              <div>
                                <Label>Review Notes</Label>
                                <Textarea
                                  placeholder="Add your review notes..."
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  className="mt-2"
                                />
                              </div>

                              <div>
                                <Label>Request Additional Information (Optional)</Label>
                                <Textarea
                                  placeholder="What additional information do you need from the applicant?"
                                  value={additionalInfoRequest}
                                  onChange={(e) => setAdditionalInfoRequest(e.target.value)}
                                  className="mt-2"
                                />
                              </div>

                              <div className="flex gap-2 pt-4">
                                <Button
                                  onClick={() =>
                                    updateApplicationStatus(selectedApplication.id, "approved", reviewNotes)
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    updateApplicationStatus(selectedApplication.id, "rejected", reviewNotes)
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    updateApplicationStatus(
                                      selectedApplication.id,
                                      "needs_more_info",
                                      reviewNotes,
                                      additionalInfoRequest,
                                    )
                                  }
                                >
                                  <Info className="h-4 w-4 mr-2" />
                                  Request More Info
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    updateApplicationStatus(selectedApplication.id, "under_review", reviewNotes)
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Mark Under Review
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}

            {filteredApplications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No applications found {statusFilter !== "all" && `with status: ${statusFilter}`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
