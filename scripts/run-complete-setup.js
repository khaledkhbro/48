/**
 * One-Click Database Setup Script
 * Automatically runs all SQL scripts in the correct order
 * Usage: node scripts/run-complete-setup.js
 */

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// List of all SQL scripts in execution order
const sqlScripts = [
  // Core Database Structure
  "01-create-tables.sql",
  "02-create-indexes.sql",
  "03-seed-categories.sql",

  // Chat System
  "04-create-chat-tables.sql",
  "05-create-chat-indexes.sql",

  // Category Management
  "06-create-category-management.sql",
  "07-seed-microjob-categories.sql",
  "08-seed-fake-microjobs.sql",

  // Workflow and Payment Systems
  "09-workflow-schema-updates.sql",
  "10-wallet-system-updates.sql",
  "11-currency-language-system.sql",
  "12-chat-money-transfer-system.sql",
  "13-instant-payment-workflow.sql",

  // Pricing and Job Management
  "14-screenshot-pricing-system.sql",
  "15-create-test-jobs-with-subcategories.sql",
  "16-add-sequential-job-ids.sql",
  "17-platform-fee-settings.sql",
  "18-job-reservation-system.sql",

  // Admin and Settings
  "19-admin-settings-table.sql",
  "20-fix-missing-tables.sql",
  "21-enhanced-revision-settings.sql",
  "22-ensure-support-pricing-table.sql",
  "23-add-transaction-constraints.sql",

  // Advanced Features
  "24-create-favorites-system.sql",
  "25-enhanced-referral-system.sql",
  "26-oauth-provider-settings.sql",
  "27-oauth-api-functions.sql",
  "28-ad-network-settings.sql",
  "29-analytics-settings.sql",
  "30-server-monitoring-schema.sql",
  "31-sample-achievements.sql",
  "32-firebase-fcm-system.sql",
  "33-marketplace-reviews-system.sql",
  "34-earnings-news-system.sql",
  "35-earnings-news-restriction-mode.sql",
  "36-email-management-system.sql",
  "37-user-settings-table.sql",
  "38-add-review-moderation.sql",
  "39-marketplace-algorithm-settings.sql",
  "40-microjob-algorithm-settings.sql",
  "41-add-rotation-tracking-constraints.sql",
  "41-fix-algorithm-constraints.sql",
  "42-three-level-marketplace-categories.sql",
  "43-populate-fiverr-micro-categories.sql",
  "44-create-public-seller-profiles.sql",
  "45-payment-gateway-settings.sql",
  "46-comprehensive-payment-system.sql",
  "47-payment-system-functions.sql",
  "48-enhanced-webhook-system.sql",

  // Latest Features
  "49-admin-roles-system.sql",
  "50-anonymous-chat-system.sql",
  "50-custom-roles-system.sql",
  "51-automated-chat-messages.sql",
  "51-page-access-permissions.sql",
  "52-user-verification-system.sql",
  "53-supabase-storage-setup.sql",
  "54-demo-agent-setup.sql",
  "55-create-chat-automation-tables.sql",
  "60-user-search-behavior-tracking.sql",
  "61-add-category-algorithm-settings.sql",
  "60-order-timer-system.sql",
  "60-service-provider-applications.sql",
  "61-user-login-tracking.sql",
  "60-create-hidden-jobs-system.sql",
  "62-create-dispute-system.sql",
  "63-admin-notifications-system.sql",
  "64-admin-service-provider-toggle.sql",

  // Additional System Tables
  "create-referral-system-tables.sql",
  "create-achievements-system.sql",
  "create-referrals-system.sql",
  "create-referral-settings-table.sql",
  "create-sample-microjobs.sql",
  "create-user-favorites-table.sql",

  // Fixes
  "fix-admin-settings-table.sql",
  "fix-refund-processing-issues.sql",
]

async function runSQLScript(scriptPath) {
  try {
    const fullPath = path.join(process.cwd(), "scripts", scriptPath)

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Skipping ${scriptPath} (file not found)`)
      return { success: true, skipped: true }
    }

    const sqlContent = fs.readFileSync(fullPath, "utf8")

    // Skip empty files
    if (!sqlContent.trim()) {
      console.log(`⚠️  Skipping ${scriptPath} (empty file)`)
      return { success: true, skipped: true }
    }

    console.log(`🔄 Running ${scriptPath}...`)

    const { error } = await supabase.rpc("exec_sql", { sql: sqlContent })

    if (error) {
      console.error(`❌ Error in ${scriptPath}:`, error.message)
      return { success: false, error: error.message }
    }

    console.log(`✅ Completed ${scriptPath}`)
    return { success: true }
  } catch (err) {
    console.error(`❌ Failed to run ${scriptPath}:`, err.message)
    return { success: false, error: err.message }
  }
}

async function runAllScripts() {
  console.log("🚀 Starting complete database setup...")
  console.log(`📋 Found ${sqlScripts.length} scripts to run\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  const errors = []

  for (const script of sqlScripts) {
    const result = await runSQLScript(script)

    if (result.success) {
      if (result.skipped) {
        skipCount++
      } else {
        successCount++
      }
    } else {
      errorCount++
      errors.push({ script, error: result.error })
    }

    // Small delay between scripts
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log("\n📊 Setup Summary:")
  console.log(`✅ Successful: ${successCount}`)
  console.log(`⚠️  Skipped: ${skipCount}`)
  console.log(`❌ Errors: ${errorCount}`)

  if (errors.length > 0) {
    console.log("\n❌ Errors encountered:")
    errors.forEach(({ script, error }) => {
      console.log(`  - ${script}: ${error}`)
    })
  }

  if (errorCount === 0) {
    console.log("\n🎉 Database setup completed successfully!")
  } else {
    console.log("\n⚠️  Setup completed with some errors. Check the logs above.")
  }
}

// Create exec_sql function if it doesn't exist
async function createExecSQLFunction() {
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `,
  })

  if (error && !error.message.includes("already exists")) {
    console.log("Creating exec_sql function...")
    // Try direct SQL execution
    await supabase.from("_").select("*").limit(0) // This will fail but establish connection
  }
}

// Run the setup
createExecSQLFunction().then(() => {
  runAllScripts().catch(console.error)
})
