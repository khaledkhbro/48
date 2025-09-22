// Test script to verify dispute system functionality
console.log("[v0] Testing marketplace dispute system...")

// Test 1: Create a test order
console.log("[v0] Test 1: Creating test marketplace order...")
const { marketplaceOrderManager } = require("../lib/marketplace-orders")

const testOrder = marketplaceOrderManager.createOrder({
  serviceId: "test-service-1",
  sellerId: "seller-123",
  buyerId: "buyer-456",
  serviceName: "Test Website Design",
  tier: "premium",
  price: 299.99,
  deliveryTime: 7,
  requirements: "Need a modern website design with responsive layout",
})

console.log("[v0] Created test order:", testOrder.id)

// Test 2: Accept and progress the order to delivered status
console.log("[v0] Test 2: Progressing order to delivered status...")
marketplaceOrderManager.acceptOrder(testOrder.id, "seller-123")
marketplaceOrderManager.updateOrderStatus(testOrder.id, "seller-123", "in_progress")
marketplaceOrderManager.submitDelivery(testOrder.id, "seller-123", {
  files: ["design-mockup.psd", "final-website.zip"],
  message: "Here is your completed website design with all requested features.",
})

const updatedOrder = marketplaceOrderManager.getOrder(testOrder.id)
console.log("[v0] Order status:", updatedOrder.status)

// Test 3: Open a dispute
console.log("[v0] Test 3: Opening dispute...")
const disputeSuccess = marketplaceOrderManager.openDispute(
  testOrder.id,
  "buyer-456",
  "Quality issues with delivered work",
  "The design doesn't match the requirements and has several issues with responsiveness.",
)

console.log("[v0] Dispute opened successfully:", disputeSuccess)

// Test 4: Check if admin dispute was created
console.log("[v0] Test 4: Checking admin dispute creation...")
setTimeout(async () => {
  try {
    const { getAdminDisputes } = require("../lib/admin-disputes")
    const disputes = await getAdminDisputes({ platform: "marketplace" })

    console.log("[v0] Found marketplace disputes:", disputes.length)

    if (disputes.length > 0) {
      const testDispute = disputes.find((d) => d.jobId === testOrder.id)
      if (testDispute) {
        console.log("[v0] ✅ Admin dispute created successfully:", testDispute.id)
        console.log("[v0] Dispute details:", {
          jobTitle: testDispute.jobTitle,
          amount: testDispute.amount,
          status: testDispute.status,
          platform: testDispute.platform,
        })

        // Test 5: Resolve the dispute
        console.log("[v0] Test 5: Resolving dispute...")
        const { resolveDispute } = require("../lib/admin-disputes")

        try {
          await resolveDispute(testDispute.id, {
            decision: "approve_employer",
            adminNotes: "After review, the buyer's concerns are valid. Issuing refund.",
            adminId: "admin-test",
          })

          console.log("[v0] ✅ Dispute resolved successfully")

          // Check final order status
          const finalOrder = marketplaceOrderManager.getOrder(testOrder.id)
          console.log("[v0] Final order status:", finalOrder.status)
          console.log("[v0] Admin decision:", finalOrder.adminDecision)
        } catch (error) {
          console.error("[v0] ❌ Failed to resolve dispute:", error.message)
        }
      } else {
        console.log("[v0] ❌ Admin dispute not found for test order")
      }
    } else {
      console.log("[v0] ❌ No marketplace disputes found")
    }
  } catch (error) {
    console.error("[v0] ❌ Error checking admin disputes:", error.message)
  }

  console.log("[v0] ✅ Dispute system test completed")
}, 1000)
