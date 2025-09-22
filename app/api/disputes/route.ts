import { type NextRequest, NextResponse } from "next/server"
import { getAdminDisputes } from "@/lib/admin-disputes"
import { marketplaceOrderManager } from "@/lib/marketplace-orders"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, userId, reason, details, userType, evidenceFiles } = body

    console.log("[v0] API: Creating dispute with data:", {
      orderId,
      userId,
      reason,
      details,
      userType,
      evidenceFiles: evidenceFiles?.length || 0,
    })

    // Get the order to validate and get details
    const order = marketplaceOrderManager.getOrder(orderId)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Determine the correct user type based on the order
    let actualUserType: "buyer" | "seller"
    if (order.buyerId === userId) {
      actualUserType = "buyer"
    } else if (order.sellerId === userId) {
      actualUserType = "seller"
    } else {
      return NextResponse.json({ error: "User not authorized for this order" }, { status: 403 })
    }

    console.log("[v0] API: Determined user type:", actualUserType)

    // Open the dispute using the marketplace order manager
    const success = marketplaceOrderManager.openDispute(orderId, userId, actualUserType, reason, details, evidenceFiles)

    if (!success) {
      return NextResponse.json({ error: "Failed to open dispute" }, { status: 400 })
    }

    console.log("[v0] API: Dispute created successfully")

    return NextResponse.json({ success: true, message: "Dispute opened successfully" })
  } catch (error) {
    console.error("[v0] API: Error creating dispute:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    const platform = searchParams.get("platform")

    const filters: any = {}
    if (status) filters.status = status
    if (platform) filters.platform = platform

    const disputes = await getAdminDisputes(filters)

    // Filter disputes for the specific user if userId is provided
    let userDisputes = disputes
    if (userId) {
      userDisputes = disputes.filter((dispute) => dispute.workerId === userId || dispute.employerId === userId)
    }

    return NextResponse.json({ disputes: userDisputes })
  } catch (error) {
    console.error("[v0] API: Error fetching disputes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
