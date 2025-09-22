import { createClient } from "./supabase-client"

export interface UserPreferences {
  id: string
  user_id: string
  preferred_currency: string
  preferred_language: string
  timezone: string
  created_at: string
  updated_at: string
}

const supabase = createClient()

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId).single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching user preferences:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getUserPreferences:", error)
    return null
  }
}

export async function createUserPreferences(
  preferences: Omit<UserPreferences, "id" | "created_at" | "updated_at">,
): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase.from("user_preferences").insert([preferences]).select().single()

    if (error) {
      console.error("Error creating user preferences:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in createUserPreferences:", error)
    return null
  }
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<UserPreferences>,
): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating user preferences:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in updateUserPreferences:", error)
    return null
  }
}

export async function upsertUserPreferences(
  preferences: Omit<UserPreferences, "id" | "created_at" | "updated_at">,
): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert([preferences], { onConflict: "user_id" })
      .select()
      .single()

    if (error) {
      console.error("Error upserting user preferences:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in upsertUserPreferences:", error)
    return null
  }
}

// Helper functions for specific preferences
export async function getUserCurrency(userId: string): Promise<string> {
  const preferences = await getUserPreferences(userId)
  return preferences?.preferred_currency || "USD"
}

export async function setUserCurrency(userId: string, currency: string): Promise<boolean> {
  try {
    await upsertUserPreferences({
      user_id: userId,
      preferred_currency: currency,
      preferred_language: "en", // default
      timezone: "UTC", // default
    })
    return true
  } catch (error) {
    console.error("Error setting user currency:", error)
    return false
  }
}

export async function getUserLanguage(userId: string): Promise<string> {
  const preferences = await getUserPreferences(userId)
  return preferences?.preferred_language || "en"
}

export async function setUserLanguage(userId: string, language: string): Promise<boolean> {
  try {
    await upsertUserPreferences({
      user_id: userId,
      preferred_currency: "USD", // default
      preferred_language: language,
      timezone: "UTC", // default
    })
    return true
  } catch (error) {
    console.error("Error setting user language:", error)
    return false
  }
}
