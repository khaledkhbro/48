import { createClient } from "./supabase-client"

export interface Service {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  category: string
  status: "active" | "inactive" | "pending"
  created_at: string
  updated_at: string
}

const supabase = createClient()

export async function getAllServices(): Promise<Service[]> {
  try {
    const { data, error } = await supabase
      .from("marketplace_services")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching services:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAllServices:", error)
    return []
  }
}

export async function createService(
  serviceData: Omit<Service, "id" | "created_at" | "updated_at">,
): Promise<Service | null> {
  try {
    const { data, error } = await supabase.from("marketplace_services").insert([serviceData]).select().single()

    if (error) {
      console.error("Error creating service:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in createService:", error)
    return null
  }
}

export async function updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
  try {
    const { data, error } = await supabase.from("marketplace_services").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating service:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in updateService:", error)
    return null
  }
}

export async function deleteService(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("marketplace_services").delete().eq("id", id)

    if (error) {
      console.error("Error deleting service:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteService:", error)
    return false
  }
}

export async function getServicesByUser(userId: string): Promise<Service[]> {
  try {
    const { data, error } = await supabase
      .from("marketplace_services")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user services:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getServicesByUser:", error)
    return []
  }
}
