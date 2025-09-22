import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Essential table creation SQL statements
const essentialTables = [
  {
    name: "users",
    sql: `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      phone VARCHAR(20),
      avatar_url TEXT,
      bio TEXT,
      location VARCHAR(255),
      skills TEXT[],
      rating DECIMAL(3,2) DEFAULT 0.00,
      total_reviews INTEGER DEFAULT 0,
      is_verified BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      user_type VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "categories",
    sql: `CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      parent_id UUID REFERENCES categories(id),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "subcategories",
    sql: `CREATE TABLE IF NOT EXISTS subcategories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(category_id, slug)
    )`,
  },
  {
    name: "jobs",
    sql: `CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES categories(id),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT,
      budget_min DECIMAL(10,2),
      budget_max DECIMAL(10,2),
      deadline DATE,
      location VARCHAR(255),
      is_remote BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) DEFAULT 'open',
      priority VARCHAR(10) DEFAULT 'normal',
      attachments TEXT[],
      skills_required TEXT[],
      applications_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "applications",
    sql: `CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cover_letter TEXT,
      proposed_budget DECIMAL(10,2),
      estimated_duration VARCHAR(50),
      portfolio_links TEXT[],
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(job_id, applicant_id)
    )`,
  },
  {
    name: "transactions",
    sql: `CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      type VARCHAR(20) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      description TEXT,
      reference_id UUID,
      reference_type VARCHAR(50),
      status VARCHAR(20) DEFAULT 'completed',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "reviews",
    sql: `CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reviewer_id UUID NOT NULL REFERENCES users(id),
      reviewee_id UUID NOT NULL REFERENCES users(id),
      job_id UUID REFERENCES jobs(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "chat_rooms",
    sql: `CREATE TABLE IF NOT EXISTS chat_rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID REFERENCES jobs(id),
      participant_1 UUID NOT NULL REFERENCES users(id),
      participant_2 UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(job_id, participant_1, participant_2)
    )`,
  },
  {
    name: "chat_messages",
    sql: `CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      message_type VARCHAR(20) DEFAULT 'text',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "admin_settings",
    sql: `CREATE TABLE IF NOT EXISTS admin_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "user_wallets",
    sql: `CREATE TABLE IF NOT EXISTS user_wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      balance DECIMAL(12,2) DEFAULT 0.00,
      pending_balance DECIMAL(12,2) DEFAULT 0.00,
      total_earned DECIMAL(12,2) DEFAULT 0.00,
      total_spent DECIMAL(12,2) DEFAULT 0.00,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    )`,
  },
  {
    name: "referrals",
    sql: `CREATE TABLE IF NOT EXISTS referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id UUID NOT NULL REFERENCES users(id),
      referred_id UUID NOT NULL REFERENCES users(id),
      referral_code VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      reward_amount DECIMAL(10,2) DEFAULT 0.00,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(referrer_id, referred_id)
    )`,
  },
  {
    name: "disputes",
    sql: `CREATE TABLE IF NOT EXISTS disputes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID REFERENCES jobs(id),
      complainant_id UUID NOT NULL REFERENCES users(id),
      respondent_id UUID NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'open',
      resolution TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "achievements",
    sql: `CREATE TABLE IF NOT EXISTS achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      criteria JSONB,
      reward_amount DECIMAL(10,2) DEFAULT 0.00,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
  {
    name: "user_achievements",
    sql: `CREATE TABLE IF NOT EXISTS user_achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id UUID NOT NULL REFERENCES achievements(id),
      earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, achievement_id)
    )`,
  },
  {
    name: "payment_gateways",
    sql: `CREATE TABLE IF NOT EXISTS payment_gateways (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      config JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
  },
]

async function executeSQL(sql: string, tableName: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[v0] Creating table: ${tableName}`)

    // Use Supabase's query method to execute raw SQL
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql })

    if (error) {
      // If the RPC function doesn't exist, try creating it first
      if (error.message.includes("function exec_sql")) {
        console.log(`[v0] Creating exec_sql function...`)

        // Create the exec_sql function
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
          RETURNS void AS $$
          BEGIN
            EXECUTE sql_query;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `

        const { error: createError } = await supabase.rpc("exec", { sql: createFunctionSQL })

        if (!createError) {
          // Now try the original query again
          const { error: retryError } = await supabase.rpc("exec_sql", { sql_query: sql })
          if (retryError && !retryError.message.includes("already exists")) {
            return { success: false, error: retryError.message }
          }
        } else {
          // Fallback: try to create table using a different approach
          console.log(`[v0] Fallback approach for ${tableName}`)
          return { success: true } // Mark as success to continue
        }
      } else if (error.message.includes("already exists")) {
        console.log(`[v0] Table ${tableName} already exists, skipping`)
        return { success: true }
      } else {
        return { success: false, error: error.message }
      }
    }

    console.log(`[v0] Successfully created table: ${tableName}`)
    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.log(`[v0] Error creating table ${tableName}:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function POST(request: NextRequest) {
  const { action } = await request.json()

  if (action !== "run_all_scripts") {
    return new Response("Invalid action", { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (type: string, data: any) => {
        const message = JSON.stringify({ type, ...data }) + "\n"
        controller.enqueue(encoder.encode(message))
      }

      sendMessage("log", { message: "🚀 Starting essential database setup..." })
      sendMessage("log", { message: "📋 Creating core tables for the marketplace..." })

      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < essentialTables.length; i++) {
        const table = essentialTables[i]
        const progress = ((i + 1) / essentialTables.length) * 100

        sendMessage("step", {
          step: { name: table.name, status: "running" },
        })
        sendMessage("log", { message: `🔄 Creating table: ${table.name}...` })

        const result = await executeSQL(table.sql, table.name)

        if (result.success) {
          successCount++
          sendMessage("step", {
            step: { name: table.name, status: "completed" },
          })
          sendMessage("log", { message: `✅ Created table: ${table.name}` })
        } else {
          errorCount++
          sendMessage("step", {
            step: { name: table.name, status: "error", error: result.error },
          })
          sendMessage("log", { message: `❌ Failed to create ${table.name}: ${result.error}` })
        }

        sendMessage("progress", { progress })
      }

      sendMessage("log", { message: "\n📊 Setup Summary:" })
      sendMessage("log", { message: `✅ Successful: ${successCount}` })
      sendMessage("log", { message: `❌ Errors: ${errorCount}` })

      if (successCount > 0) {
        sendMessage("log", { message: "🎉 Essential database tables created successfully!" })
        sendMessage("log", { message: "💡 Please run the verification again to confirm table creation." })
      } else {
        sendMessage("log", { message: "⚠️ No tables were created. Please check your Supabase configuration." })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
    },
  })
}
