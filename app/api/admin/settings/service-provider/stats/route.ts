import { NextResponse } from "next/server"

// GET - Fetch service provider statistics
export async function GET() {
  try {
    // In a real app, this would query your database for actual stats
    // For now, we'll return mock data
    const stats = {
      totalApplications: 45,
      pendingApplications: 8,
      approvedProviders: 32,
      totalServices: 156,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error fetching service provider stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
