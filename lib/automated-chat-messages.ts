import { createClient } from "@supabase/supabase-js"
import redisClient from "./redis-client"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase: any = null
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    console.warn("[v0] Failed to initialize Supabase client:", error)
  }
}

export interface AutomatedMessageTemplate {
  id: number
  template_name: string // Updated to match actual database column
  trigger_type: string // Updated to match actual database column
  content: string // Updated to match actual database column
  is_active: boolean
  delay_seconds: number
  variables?: Record<string, any> // Made optional since not in database
}

export interface ChatAutomationSettings {
  welcome_message_enabled: boolean
  proactive_messages_enabled: boolean
  business_hours_start: string
  business_hours_end: string
  business_days: string[]
  idle_timeout_minutes: number
  no_response_timeout_minutes: number
  max_proactive_messages: number
  queue_update_interval_minutes: number
  auto_close_timeout_minutes: number
}

// Get automation settings
export async function getChatAutomationSettings(): Promise<ChatAutomationSettings> {
  try {
    if (!supabase) {
      console.warn("[v0] Supabase not available, using default automation settings")
      return getDefaultAutomationSettings()
    }

    const { data, error } = await supabase.from("chat_automation_settings").select("setting_key, setting_value")

    if (error) {
      console.warn("[v0] Database error getting automation settings:", error)
      return getDefaultAutomationSettings()
    }

    if (!data || !Array.isArray(data)) {
      console.warn("[v0] Invalid data format from database, using defaults")
      return getDefaultAutomationSettings()
    }

    const settings: any = {}
    data.forEach(({ setting_key, setting_value }) => {
      if (!setting_key || setting_value === undefined || setting_value === null) {
        console.warn("[v0] Invalid setting data:", { setting_key, setting_value })
        return
      }

      try {
        if (setting_key === "business_days") {
          settings[setting_key] = setting_value.split(",")
        } else if (setting_key.includes("_minutes") || setting_key.includes("max_")) {
          settings[setting_key] = Number.parseInt(setting_value)
        } else if (setting_key.includes("_enabled")) {
          settings[setting_key] = setting_value === "true"
        } else {
          settings[setting_key] = setting_value
        }
      } catch (parseError) {
        console.warn("[v0] Failed to parse setting:", { setting_key, setting_value, error: parseError })
      }
    })

    const defaultSettings = getDefaultAutomationSettings()
    return { ...defaultSettings, ...settings }
  } catch (error) {
    console.error("[v0] Failed to get automation settings:", error)
    return getDefaultAutomationSettings()
  }
}

// Get automated message templates
export async function getAutomatedMessageTemplates(type?: string): Promise<AutomatedMessageTemplate[]> {
  try {
    if (!supabase) {
      console.warn("[v0] Supabase not available, using default message templates")
      return getDefaultMessageTemplates(type)
    }

    let query = supabase
      .from("automated_message_templates")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true }) // Use id instead of priority since priority column doesn't exist

    if (type) {
      // Map type to trigger_type patterns
      const triggerPatterns: Record<string, string[]> = {
        welcome: ["session_start"],
        proactive: ["idle_5min", "outside_hours"],
        follow_up: ["no_response_10min"],
        closing: ["session_end"],
      }

      const patterns = triggerPatterns[type] || []
      if (patterns.length > 0) {
        query = query.in("trigger_type", patterns)
      }
    }

    const { data, error } = await query

    if (error) {
      console.warn("[v0] Database error getting message templates:", error)
      return getDefaultMessageTemplates(type)
    }

    if (!data || !Array.isArray(data)) {
      console.warn("[v0] Invalid data format from database, using default templates")
      return getDefaultMessageTemplates(type)
    }

    // Validate each template has required fields
    const validTemplates = data.filter((template) => {
      if (!template || typeof template !== "object") {
        console.warn("[v0] Invalid template object:", template)
        return false
      }

      const requiredFields = ["id", "template_name", "trigger_type", "content", "is_active"]
      const hasRequiredFields = requiredFields.every((field) => template.hasOwnProperty(field))

      if (!hasRequiredFields) {
        console.warn("[v0] Template missing required fields:", template)
        return false
      }

      return true
    })

    return validTemplates.length > 0 ? validTemplates : getDefaultMessageTemplates(type)
  } catch (error) {
    console.error("[v0] Failed to get automated message templates:", error)
    return getDefaultMessageTemplates(type)
  }
}

// Process message variables
export function processMessageVariables(content: string, variables: Record<string, any>): string {
  let processedContent = content

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g")
    processedContent = processedContent.replace(regex, String(value))
  })

  return processedContent
}

// Check if within business hours
export function isWithinBusinessHours(settings: ChatAutomationSettings): boolean {
  const now = new Date()
  const currentDay = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

  // Check if current day is a business day
  if (!settings.business_days.includes(currentDay)) {
    return false
  }

  // Check if current time is within business hours
  return currentTime >= settings.business_hours_start && currentTime <= settings.business_hours_end
}

// Send automated message
export async function sendAutomatedMessage(
  sessionId: string,
  templateId: number,
  variables: Record<string, any> = {},
): Promise<boolean> {
  try {
    let template: AutomatedMessageTemplate | null = null

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("automated_message_templates")
          .select("*")
          .eq("id", templateId)
          .eq("is_active", true)
          .single()

        if (!error && data) {
          template = data
        }
      } catch (dbError) {
        console.warn("[v0] Failed to get template from database:", dbError)
      }
    }

    // Fallback to default templates
    if (!template) {
      const defaultTemplates = getDefaultMessageTemplates()
      template = defaultTemplates.find((t) => t.id === templateId) || null
    }

    if (!template) {
      console.error("[v0] Template not found:", templateId)
      return false
    }

    const processedContent = processMessageVariables(template.content, {
      ...(template.variables || {}),
      ...variables,
    })

    // Add delay if specified
    if (template.delay_seconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, template.delay_seconds * 1000))
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const message = {
      id: messageId,
      sessionId,
      content: processedContent,
      senderType: "system",
      messageType: "automated",
      timestamp: Date.now(),
    }

    await redisClient.storeMessage(sessionId, message)

    if (supabase) {
      try {
        await supabase.from("automated_message_logs").insert({
          session_id: sessionId,
          template_id: templateId,
          message_content: processedContent,
          trigger_type: template.trigger_type, // Use trigger_type instead of trigger_condition
          success: true,
        })
      } catch (logError) {
        console.warn("[v0] Failed to log automated message:", logError)
      }
    }

    console.log("[v0] Automated message sent:", { sessionId, templateId, content: processedContent })
    return true
  } catch (error) {
    console.error("[v0] Failed to send automated message:", error)

    if (supabase) {
      try {
        await supabase.from("automated_message_logs").insert({
          session_id: sessionId,
          template_id: templateId,
          message_content: "Failed to send",
          trigger_type: "error",
          success: false,
        })
      } catch (logError) {
        console.warn("[v0] Failed to log error:", logError)
      }
    }

    return false
  }
}

// Trigger welcome message
export async function triggerWelcomeMessage(sessionId: string): Promise<void> {
  try {
    const settings = await getChatAutomationSettings()

    if (!settings.welcome_message_enabled) {
      return
    }

    const templates = await getAutomatedMessageTemplates("welcome")
    if (templates.length === 0) {
      return
    }

    const welcomeTemplate = templates[0] // Use first welcome template

    // Add business hours context if outside hours
    const variables: Record<string, any> = {}
    if (!isWithinBusinessHours(settings)) {
      const businessHoursTemplates = await getAutomatedMessageTemplates("proactive")
      const businessHoursTemplate = businessHoursTemplates.find((t) => t.trigger_type === "outside_hours") // Use trigger_type

      if (businessHoursTemplate) {
        await sendAutomatedMessage(sessionId, businessHoursTemplate.id, variables)
        return
      }
    }

    await sendAutomatedMessage(sessionId, welcomeTemplate.id, variables)
  } catch (error) {
    console.error("[v0] Failed to trigger welcome message:", error)
  }
}

// Trigger idle message
export async function triggerIdleMessage(sessionId: string): Promise<void> {
  try {
    const settings = await getChatAutomationSettings()

    if (!settings.proactive_messages_enabled) {
      return
    }

    let canSendProactive = true

    if (supabase) {
      try {
        const { data: sentMessages } = await supabase
          .from("automated_message_logs")
          .select("id")
          .eq("session_id", sessionId)
          .in("trigger_type", ["idle_5min", "no_response_10min"])

        if (sentMessages && sentMessages.length >= settings.max_proactive_messages) {
          canSendProactive = false
        }
      } catch (error) {
        console.warn("[v0] Failed to check sent messages, allowing proactive message:", error)
      }
    }

    if (!canSendProactive) {
      return
    }

    const templates = await getAutomatedMessageTemplates("proactive")
    const idleTemplate = templates.find((t) => t.trigger_type === "idle_5min") // Use trigger_type

    if (idleTemplate) {
      await sendAutomatedMessage(sessionId, idleTemplate.id)
    }
  } catch (error) {
    console.error("[v0] Failed to trigger idle message:", error)
  }
}

// Trigger no response follow-up
export async function triggerNoResponseMessage(sessionId: string): Promise<void> {
  try {
    const settings = await getChatAutomationSettings()

    if (!settings.proactive_messages_enabled) {
      return
    }

    const templates = await getAutomatedMessageTemplates("follow_up")
    const noResponseTemplate = templates.find((t) => t.trigger_type === "no_response_10min") // Use trigger_type

    if (noResponseTemplate) {
      await sendAutomatedMessage(sessionId, noResponseTemplate.id)
    }
  } catch (error) {
    console.error("[v0] Failed to trigger no response message:", error)
  }
}

// Schedule automated messages for a session
export async function scheduleAutomatedMessages(sessionId: string): Promise<void> {
  try {
    const settings = await getChatAutomationSettings()

    // Schedule idle message
    if (settings.proactive_messages_enabled) {
      setTimeout(
        () => {
          triggerIdleMessage(sessionId)
        },
        settings.idle_timeout_minutes * 60 * 1000,
      )

      // Schedule no response message
      setTimeout(
        () => {
          triggerNoResponseMessage(sessionId)
        },
        settings.no_response_timeout_minutes * 60 * 1000,
      )
    }

    console.log("[v0] Automated messages scheduled for session:", sessionId)
  } catch (error) {
    console.error("[v0] Failed to schedule automated messages:", error)
  }
}

// Helper function for default settings
function getDefaultAutomationSettings(): ChatAutomationSettings {
  return {
    welcome_message_enabled: true,
    proactive_messages_enabled: true,
    business_hours_start: "09:00",
    business_hours_end: "18:00",
    business_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    idle_timeout_minutes: 5,
    no_response_timeout_minutes: 10,
    max_proactive_messages: 3,
    queue_update_interval_minutes: 2,
    auto_close_timeout_minutes: 30,
  }
}

// Helper function for default message templates
function getDefaultMessageTemplates(type?: string): AutomatedMessageTemplate[] {
  const allTemplates: AutomatedMessageTemplate[] = [
    {
      id: 1,
      template_name: "Welcome Message", // Updated to match database schema
      trigger_type: "session_start", // Updated to match database schema
      content: "Hello! Welcome to our support chat. How can I help you today?", // Updated to match database schema
      is_active: true,
      delay_seconds: 2,
      variables: {},
    },
    {
      id: 2,
      template_name: "Idle Check", // Updated to match database schema
      trigger_type: "idle_5min", // Updated to match database schema
      content: "Are you still there? Is there anything else I can help you with?", // Updated to match database schema
      is_active: true,
      delay_seconds: 0,
      variables: {},
    },
    {
      id: 3,
      template_name: "No Response Follow-up", // Updated to match database schema
      trigger_type: "no_response_10min", // Updated to match database schema
      content: "I haven't heard from you in a while. If you need further assistance, please let me know!", // Updated to match database schema
      is_active: true,
      delay_seconds: 0,
      variables: {},
    },
  ]

  if (!type) return allTemplates

  const triggerPatterns: Record<string, string[]> = {
    welcome: ["session_start"],
    proactive: ["idle_5min", "outside_hours"],
    follow_up: ["no_response_10min"],
    closing: ["session_end"],
  }

  const patterns = triggerPatterns[type] || []
  return allTemplates.filter((t) => patterns.includes(t.trigger_type))
}
