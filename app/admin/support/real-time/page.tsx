"use client"

import { AdminHeader } from "@/components/admin/admin-header"
import { RealTimeSupportSystem } from "@/components/admin/real-time-support"

export default function RealTimeSupportPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Real-time Support System"
        description="Monitor and manage live customer support conversations"
      />
      <RealTimeSupportSystem />
    </div>
  )
}
