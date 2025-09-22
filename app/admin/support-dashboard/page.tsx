"use client"

import { AdminHeader } from "@/components/admin/admin-header"
import { RealTimeSupportDashboard } from "@/components/support/real-time-support-dashboard"

export default function AdminSupportDashboardPage() {
  return (
    <>
      <AdminHeader
        title="Support Dashboard"
        description="Real-time monitoring of support operations and agent performance"
      />

      <div className="flex-1 overflow-auto p-6">
        <RealTimeSupportDashboard />
      </div>
    </>
  )
}
