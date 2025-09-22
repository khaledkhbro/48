import { createClient } from "./supabase-client"

export interface ScreenshotPricingTier {
  id: number
  screenshot_number: number
  percentage_fee: number
  is_free: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ScreenshotPricingSettings {
  max_screenshots_allowed: number
  default_screenshot_fee: number
  enable_percentage_pricing: boolean
  platform_screenshot_fee: number
}

const supabase = createClient()

export async function getScreenshotPricingTiers(): Promise<ScreenshotPricingTier[]> {
  try {
    const { data, error } = await supabase
      .from("screenshot_pricing_tiers_local")
      .select("*")
      .eq("is_active", true)
      .order("screenshot_number", { ascending: true })

    if (error) {
      console.error("Error fetching screenshot pricing tiers:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getScreenshotPricingTiers:", error)
    return []
  }
}

export async function getScreenshotPricingSettings(): Promise<ScreenshotPricingSettings> {
  try {
    const { data, error } = await supabase
      .from("screenshot_pricing_settings_local")
      .select("setting_name, setting_value")

    if (error) {
      console.error("Error fetching screenshot pricing settings:", error)
      return getDefaultSettings()
    }

    if (!data || data.length === 0) {
      return getDefaultSettings()
    }

    const settings: any = {}
    data.forEach((row) => {
      const key = row.setting_name
      const value = row.setting_value

      if (key === "enable_percentage_pricing") {
        settings[key] = value === 1
      } else {
        settings[key] = value
      }
    })

    return {
      max_screenshots_allowed: settings.max_screenshots_allowed || 5,
      default_screenshot_fee: settings.default_screenshot_fee || 0.05,
      enable_percentage_pricing: settings.enable_percentage_pricing || true,
      platform_screenshot_fee: settings.platform_screenshot_fee || 0,
    }
  } catch (error) {
    console.error("Error in getScreenshotPricingSettings:", error)
    return getDefaultSettings()
  }
}

function getDefaultSettings(): ScreenshotPricingSettings {
  return {
    max_screenshots_allowed: 5,
    default_screenshot_fee: 0.05,
    enable_percentage_pricing: true,
    platform_screenshot_fee: 0,
  }
}

export async function updateScreenshotPricingTier(
  tierId: number,
  updates: Partial<ScreenshotPricingTier>,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("screenshot_pricing_tiers_local").update(updates).eq("id", tierId)

    if (error) {
      console.error("Error updating screenshot pricing tier:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateScreenshotPricingTier:", error)
    return false
  }
}

export async function updateScreenshotPricingSetting(settingName: string, settingValue: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("screenshot_pricing_settings_local")
      .update({ setting_value: settingValue })
      .eq("setting_name", settingName)

    if (error) {
      console.error("Error updating screenshot pricing setting:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateScreenshotPricingSetting:", error)
    return false
  }
}

// Calculate screenshot costs (same logic as before, but using DB data)
export async function calculateScreenshotCosts(
  screenshotCount: number,
  totalJobCost: number,
): Promise<{
  screenshotCount: number
  totalJobCost: number
  screenshotCosts: Array<{
    screenshotNumber: number
    cost: number
    percentage: number
    isFree: boolean
  }>
  totalScreenshotCost: number
  breakdown: string
}> {
  try {
    const [tiers, settings] = await Promise.all([getScreenshotPricingTiers(), getScreenshotPricingSettings()])

    const screenshotCosts: Array<{
      screenshotNumber: number
      cost: number
      percentage: number
      isFree: boolean
    }> = []

    let totalScreenshotCost = 0

    for (let i = 1; i <= Math.min(screenshotCount, settings.max_screenshots_allowed); i++) {
      const tier = tiers.find((t) => t.screenshot_number === i)

      if (tier) {
        const isFree = tier.is_free
        const percentage = tier.percentage_fee
        const cost = isFree ? 0 : (totalJobCost * percentage) / 100

        screenshotCosts.push({
          screenshotNumber: i,
          cost,
          percentage,
          isFree,
        })

        totalScreenshotCost += cost
      } else {
        const cost = settings.enable_percentage_pricing ? 0 : settings.default_screenshot_fee
        screenshotCosts.push({
          screenshotNumber: i,
          cost,
          percentage: 0,
          isFree: false,
        })
        totalScreenshotCost += cost
      }
    }

    const breakdown = screenshotCosts
      .map((sc) => {
        if (sc.isFree) {
          return `Screenshot ${sc.screenshotNumber}: Free`
        } else if (sc.percentage > 0) {
          return `Screenshot ${sc.screenshotNumber}: ${sc.percentage}% ($${sc.cost.toFixed(2)})`
        } else {
          return `Screenshot ${sc.screenshotNumber}: $${sc.cost.toFixed(2)}`
        }
      })
      .join(", ")

    return {
      screenshotCount: Math.min(screenshotCount, settings.max_screenshots_allowed),
      totalJobCost,
      screenshotCosts,
      totalScreenshotCost,
      breakdown,
    }
  } catch (error) {
    console.error("Error calculating screenshot costs:", error)
    const fallbackCost = screenshotCount * 0.05
    return {
      screenshotCount,
      totalJobCost,
      screenshotCosts: [],
      totalScreenshotCost: fallbackCost,
      breakdown: `${screenshotCount} screenshots × $0.05 = $${fallbackCost.toFixed(2)}`,
    }
  }
}
