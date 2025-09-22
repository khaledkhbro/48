"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { Store, TrendingUp, Languages, Briefcase, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react"

export default function MarketplaceProfilePage() {
  const { user } = useAuth()
  const [sellerStatus, setSellerStatus] = useState<"not_applied" | "pending" | "approved" | "rejected">("not_applied")
  const [sellerLevel, setSellerLevel] = useState("New Seller")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check seller application status
    checkSellerStatus()
  }, [user])

  const checkSellerStatus = async () => {
    try {
      // This would normally fetch from API
      // For now, simulate different states
      setSellerStatus("not_applied")
      setLoading(false)
    } catch (error) {
      console.error("Error checking seller status:", error)
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (sellerStatus) {
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Approved Seller
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Application Rejected
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Applied
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="Marketplace Profile"
          description="Manage your seller profile and marketplace presence"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading your marketplace profile...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader title="Marketplace Profile" description="Manage your seller profile and marketplace presence" />

      <div className="grid gap-6">
        {/* Seller Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Seller Status</CardTitle>
                  <CardDescription>Your current marketplace seller status</CardDescription>
                </div>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            {sellerStatus === "not_applied" && (
              <div className="text-center py-8">
                <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Start Selling?</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Apply to become a verified seller on our marketplace. Share your skills and start earning by offering
                  your services to buyers worldwide.
                </p>
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Apply to Become a Seller
                </Button>
              </div>
            )}

            {sellerStatus === "pending" && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Application Under Review</h3>
                <p className="text-muted-foreground mb-4">
                  Your seller application is being reviewed by our team. We'll notify you within 2-3 business days.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-orange-800">
                    <strong>What's next?</strong> Our team is reviewing your application and will contact you soon with
                    the results.
                  </p>
                </div>
              </div>
            )}

            {sellerStatus === "approved" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Welcome, Seller!</h3>
                    <p className="text-muted-foreground">You're approved to sell on our marketplace</p>
                  </div>
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active Seller
                  </Badge>
                </div>
              </div>
            )}

            {sellerStatus === "rejected" && (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Application Not Approved</h3>
                <p className="text-muted-foreground mb-6">
                  Unfortunately, your seller application was not approved at this time. You can reapply after addressing
                  the feedback.
                </p>
                <Button variant="outline">View Feedback & Reapply</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Level & Progress - Only show if approved */}
        {sellerStatus === "approved" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Seller Level & Progress</CardTitle>
                  <CardDescription>Track your progress and unlock new benefits</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Your Seller Level</h3>
                  <p className="text-2xl font-bold text-primary">{sellerLevel}</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Level 1
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Progress to Level 2</span>
                  <span>2/10 orders completed</span>
                </div>
                <Progress value={20} className="h-2" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">Orders Completed</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">5.0</div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">100%</div>
                  <div className="text-sm text-gray-600">Response Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills & Languages Management */}
        <Tabs defaultValue="skills" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
          </TabsList>

          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Skills Management</CardTitle>
                    <CardDescription>Showcase your expertise to attract more buyers</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Web Development</Badge>
                    <Badge variant="secondary">React</Badge>
                    <Badge variant="secondary">Node.js</Badge>
                    <Badge variant="secondary">TypeScript</Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    + Add New Skill
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="languages">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Languages className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Languages</CardTitle>
                    <CardDescription>Add languages you can communicate in</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">English - Native</Badge>
                    <Badge variant="secondary">Spanish - Conversational</Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    + Add Language
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
