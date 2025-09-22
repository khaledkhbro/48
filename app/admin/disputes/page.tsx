"use client"

import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Package, ArrowRight, BarChart3, Users, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function DisputesOverviewPage() {
  return (
    <>
      <AdminHeader title="Dispute Management" description="Overview of all platform disputes" />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Platform Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/disputes/microjob">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Briefcase className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Microjob Disputes</h3>
                        <p className="text-gray-600">Manage freelance job disputes</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">12</div>
                      <div className="text-sm text-gray-600">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">5</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">47</div>
                      <div className="text-sm text-gray-600">Resolved</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">Microjob Platform</Badge>
                    <span className="text-sm text-gray-500">Click to manage</span>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/disputes/marketplace">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Package className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Marketplace Disputes</h3>
                        <p className="text-gray-600">Manage product order disputes</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">8</div>
                      <div className="text-sm text-gray-600">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">3</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">23</div>
                      <div className="text-sm text-gray-600">Resolved</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge className="bg-green-100 text-green-800 border-green-200">Marketplace Platform</Badge>
                    <span className="text-sm text-gray-500">Click to manage</span>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* Combined Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Total Disputes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">20</div>
                <p className="text-xs text-gray-600">Across both platforms</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Resolution Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">87%</div>
                <p className="text-xs text-gray-600">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Avg Resolution Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">2.3</div>
                <p className="text-xs text-gray-600">Days average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">3</div>
                <p className="text-xs text-gray-600">Require immediate attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button asChild className="h-auto p-4 justify-start">
                  <Link href="/admin/disputes/microjob?status=pending">
                    <div className="text-left">
                      <div className="font-medium">Review Pending Microjob Disputes</div>
                      <div className="text-sm opacity-70">5 disputes awaiting review</div>
                    </div>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-auto p-4 justify-start bg-transparent">
                  <Link href="/admin/disputes/marketplace?status=pending">
                    <div className="text-left">
                      <div className="font-medium">Review Pending Marketplace Disputes</div>
                      <div className="text-sm opacity-70">3 disputes awaiting review</div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
