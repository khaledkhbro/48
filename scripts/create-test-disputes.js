// Script to create test disputes for both platforms
console.log("[v0] Creating test disputes for both platforms...")

async function createTestDisputes() {
  try {
    const { createAdminDispute } = require("../lib/admin-disputes")

    // Create marketplace dispute
    console.log("[v0] Creating marketplace dispute...")
    const marketplaceDispute = await createAdminDispute({
      jobId: "marketplace-order-001",
      workProofId: "marketplace_marketplace-order-001",
      workerId: "seller-789",
      employerId: "buyer-123",
      jobTitle: "E-commerce Website Development",
      workerName: "WebDev Pro",
      employerName: "Store Owner",
      amount: 1299.99,
      reason: "Delivered website has major functionality issues",
      description:
        "The shopping cart doesn't work properly and the payment integration is broken. This doesn't meet the agreed specifications.",
      requestedAction: "refund",
      priority: "high",
      evidenceCount: 3,
      platform: "marketplace",
    })

    console.log("[v0] ✅ Created marketplace dispute:", marketplaceDispute.id)

    // Create microjob dispute
    console.log("[v0] Creating microjob dispute...")
    const microjobDispute = await createAdminDispute({
      jobId: "microjob-task-002",
      workProofId: "proof_microjob-task-002",
      workerId: "freelancer-456",
      employerId: "client-789",
      jobTitle: "Logo Design for Startup",
      workerName: "Creative Designer",
      employerName: "Startup Founder",
      amount: 150.0,
      reason: "Design doesn't match the brief",
      description:
        "The logo design is completely different from what was requested in the brief. Colors and style are wrong.",
      requestedAction: "revision",
      priority: "medium",
      evidenceCount: 2,
      platform: "microjob",
    })

    console.log("[v0] ✅ Created microjob dispute:", microjobDispute.id)

    // Verify disputes were created
    const { getAdminDisputes } = require("../lib/admin-disputes")

    const marketplaceDisputes = await getAdminDisputes({ platform: "marketplace" })
    const microjobDisputes = await getAdminDisputes({ platform: "microjob" })

    console.log("[v0] ✅ Total marketplace disputes:", marketplaceDisputes.length)
    console.log("[v0] ✅ Total microjob disputes:", microjobDisputes.length)

    console.log("[v0] 🎉 Test disputes created successfully!")
  } catch (error) {
    console.error("[v0] ❌ Error creating test disputes:", error.message)
  }
}

createTestDisputes()
