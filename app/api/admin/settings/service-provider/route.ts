import { type NextRequest, NextResponse } from "next/server"

// GET - Fetch service provider approval setting
export async function GET() {
  try {
    // In a real app, this would query your database
    // For now, we'll simulate with localStorage-like behavior
    const setting = {
      id: "1",
      setting_key: "require_service_provider_approval",
      setting_value: "true", // Default to requiring approval
      setting_type: "boolean",
      description: "When enabled, users must apply and get approved before they can create services",
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json({ setting })
  } catch (error) {
    console.error("Error fetching service provider setting:", error)
    return NextResponse.json({ error: "Failed to fetch setting" }, { status: 500 })
  }
}

// PUT - Update service provider approval setting
export async function PUT(request: NextRequest) {
  try {
    const { require_approval } = await request.json()

    // In a real app, this would update your database
    // For now, we'll simulate the update
    const updatedSetting = {
      id: "1",
      setting_key: "require_service_provider_approval",
      setting_value: require_approval.toString(),
      setting_type: "boolean",
      description: "When enabled, users must apply and get approved before they can create services",
      updated_at: new Date().toISOString(),
    }

    // Store in localStorage for demo purposes
    if (typeof window !== "undefined") {
      localStorage.setItem("require_service_provider_approval", require_approval.toString())
    }

    return NextResponse.json({
      success: true,
      setting: updatedSetting,
      message: require_approval
        ? "Service provider approval is now required"
        : "Service provider approval is now disabled",
    })
  } catch (error) {
    console.error("Error updating service provider setting:", error)
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
  }
}
