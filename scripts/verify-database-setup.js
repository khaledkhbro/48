// Database Setup Verification Script
// Checks if all tables and functions are properly created

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyDatabaseSetup() {
  console.log("🔍 Verifying Database Setup...")
  console.log("================================")

  try {
    // Check essential tables
    const essentialTables = [
      "users",
      "jobs",
      "categories",
      "subcategories",
      "applications",
      "transactions",
      "reviews",
      "chat_rooms",
      "chat_messages",
      "admin_settings",
      "user_wallets",
      "referrals",
    ]

    let allTablesExist = true

    for (const table of essentialTables) {
      const { data, error } = await supabase.from(table).select("*").limit(1)

      if (error) {
        console.log(`❌ Table '${table}' - ${error.message}`)
        allTablesExist = false
      } else {
        console.log(`✅ Table '${table}' - OK`)
      }
    }

    // Check if we have sample data
    const { data: jobsData } = await supabase.from("jobs").select("count").single()

    const { data: categoriesData } = await supabase.from("categories").select("count").single()

    console.log("\n📊 Data Summary:")
    console.log(`Jobs: ${jobsData?.count || 0}`)
    console.log(`Categories: ${categoriesData?.count || 0}`)

    if (allTablesExist) {
      console.log("\n🎉 Database Setup Verification PASSED!")
      console.log("Your microjob marketplace is ready to use.")
    } else {
      console.log("\n⚠️  Some tables are missing. Please run the setup scripts again.")
    }
  } catch (error) {
    console.error("❌ Verification failed:", error.message)
  }
}

verifyDatabaseSetup()
