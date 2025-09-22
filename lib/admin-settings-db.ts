import { createClient } from "./supabase-client"

export interface RevisionSettings {
  max_revision_requests: number
  revision_request_timeout_value: number
  revision_request_timeout_unit: "minutes" | "hours" | "days"
  rejection_response_timeout_value: number
  rejection_response_timeout_unit: "minutes" | "hours" | "days"
  enable_automatic_refunds: boolean
  refund_on_revision_timeout: boolean
  refund_on_rejection_timeout: boolean
  enable_revision_warnings: boolean
  revision_penalty_enabled: boolean
  revision_penalty_amount: number
}

const supabase = createClient()

export async function getRevisionSettingsFromDB(): Promise<RevisionSettings> {
  try {
    const { data, error } = await supabase.from("admin_revision_settings_local").select("*").eq("id", 1).single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching revision settings from DB:", error)
      return getDefaultRevisionSettings()
    }

    if (!data) {
      return getDefaultRevisionSettings()
    }

    return {
      max_revision_requests: data.max_revision_requests,
      revision_request_timeout_value: data.revision_request_timeout_value,
      revision_request_timeout_unit: data.revision_request_timeout_unit,
      rejection_response_timeout_value: data.rejection_response_timeout_value,
      rejection_response_timeout_unit: data.rejection_response_timeout_unit,
      enable_automatic_refunds: data.enable_automatic_refunds,
      refund_on_revision_timeout: data.refund_on_revision_timeout,
      refund_on_rejection_timeout: data.refund_on_rejection_timeout,
      enable_revision_warnings: data.enable_revision_warnings,
      revision_penalty_enabled: data.revision_penalty_enabled,
      revision_penalty_amount: data.revision_penalty_amount,
    }
  } catch (error) {
    console.error("Error in getRevisionSettingsFromDB:", error)
    return getDefaultRevisionSettings()
  }
}

function getDefaultRevisionSettings(): RevisionSettings {
  return {
    max_revision_requests: 2,
    revision_request_timeout_value: 24,
    revision_request_timeout_unit: "hours",
    rejection_response_timeout_value: 1,
    rejection_response_timeout_unit: "minutes",
    enable_automatic_refunds: true,
    refund_on_revision_timeout: true,
    refund_on_rejection_timeout: true,
    enable_revision_warnings: true,
    revision_penalty_enabled: false,
    revision_penalty_amount: 0,
  }
}

export async function updateRevisionSettingsInDB(settings: RevisionSettings): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("admin_revision_settings_local")
      .upsert([{ id: 1, ...settings }], { onConflict: "id" })

    if (error) {
      console.error("Error updating revision settings in DB:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateRevisionSettingsInDB:", error)
    return false
  }
}

// Keep the old API function for backward compatibility, but use DB
export const getRevisionSettingsFromAPI = getRevisionSettingsFromDB

// Deprecated localStorage functions - kept for backward compatibility
export const getRevisionSettings = (): RevisionSettings => {
  console.warn("[DEPRECATED] getRevisionSettings() uses localStorage. Use getRevisionSettingsFromDB() instead.")
  return getDefaultRevisionSettings()
}

export const updateRevisionSettings = (settings: RevisionSettings): void => {
  console.warn("[DEPRECATED] updateRevisionSettings() uses localStorage. Use updateRevisionSettingsInDB() instead.")
  // Could optionally sync to DB here
}
