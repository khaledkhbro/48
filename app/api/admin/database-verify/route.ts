import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
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
      "disputes",
      "achievements",
      "user_achievements",
      "payment_gateways",
    ]

    const results = []
    let successfulTables = 0

    for (const table of essentialTables) {
      try {
        const { data, error } = await supabase.from(table).select("*").limit(1)

        if (error) {
          results.push({
            table,
            status: "error",
            message: error.message,
          })
        } else {
          results.push({
            table,
            status: "success",
            message: "OK",
          })
          successfulTables++
        }
      } catch (err) {
        results.push({
          table,
          status: "error",
          message: "Table not accessible",
        })
      }
    }

    const { count: jobsCount } = await supabase.from("jobs").select("*", { count: "exact", head: true })

    const { count: categoriesCount } = await supabase.from("categories").select("*", { count: "exact", head: true })

    const summary = {
      totalTables: essentialTables.length,
      successfulTables,
      totalJobs: jobsCount || 0,
      totalCategories: categoriesCount || 0,
      allTablesWorking: successfulTables === essentialTables.length,
    }

    return NextResponse.json({
      success: true,
      results,
      summary,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
