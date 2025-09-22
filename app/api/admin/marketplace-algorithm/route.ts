import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const [algorithmSettings, personalizationSettings, behaviorSettings, subcategories, microCategories] =
      await Promise.all([
        sql`SELECT * FROM marketplace_algorithm_settings ORDER BY created_at DESC`,
        sql`SELECT * FROM personalized_algorithm_settings WHERE setting_key = 'personalization_weights'`,
        sql`SELECT * FROM personalized_algorithm_settings WHERE setting_key = 'behavior_tracking'`,
        sql`
        SELECT s.*, c.name as category_name 
        FROM marketplace_subcategories s 
        JOIN marketplace_categories c ON s.category_id = c.id 
        WHERE s.is_active = true 
        ORDER BY s.sort_order
      `,
        sql`
        SELECT m.*, s.name as subcategory_name 
        FROM marketplace_micro_categories m 
        JOIN marketplace_subcategories s ON m.subcategory_id = s.id 
        WHERE m.is_active = true 
        ORDER BY m.sort_order
      `,
      ])

    return NextResponse.json({
      algorithmSettings: algorithmSettings || [],
      personalizationSettings: personalizationSettings[0]?.setting_value || {},
      behaviorTrackingSettings: behaviorSettings[0]?.setting_value || {},
      promotedServices: [],
      subcategoryControls: subcategories || [],
      microCategoryControls: microCategories || [],
    })
  } catch (error) {
    console.error("Error fetching algorithm settings:", error)
    return NextResponse.json({ error: "Failed to fetch algorithm settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      algorithmSettings,
      personalizationSettings,
      behaviorTrackingSettings,
      promotedServices,
      subcategoryControls,
      microCategoryControls,
      serviceControls,
      pageSettings,
    } = await request.json()

    if (microCategoryControls) {
      // Update micro category algorithm settings
      for (const microCategory of microCategoryControls) {
        await sql`
          UPDATE marketplace_micro_categories 
          SET 
            weight = ${microCategory.weight},
            priority = ${microCategory.priority},
            algorithm_enabled = ${microCategory.enabled}
          WHERE id = ${microCategory.id}
        `
      }
    }

    if (subcategoryControls) {
      // Update subcategory algorithm settings
      for (const subcategory of subcategoryControls) {
        await sql`
          UPDATE marketplace_subcategories 
          SET 
            weight = ${subcategory.weight},
            priority = ${subcategory.priority},
            algorithm_enabled = ${subcategory.enabled}
          WHERE id = ${subcategory.id}
        `
      }
    }

    if (personalizationSettings) {
      await sql`
        INSERT INTO personalized_algorithm_settings (setting_key, setting_value, description, updated_at)
        VALUES ('personalization_weights', ${JSON.stringify(personalizationSettings)}, 'User behavior-based personalization weights', NOW())
        ON CONFLICT (setting_key) 
        DO UPDATE SET 
          setting_value = ${JSON.stringify(personalizationSettings)},
          updated_at = NOW()
      `
    }

    if (behaviorTrackingSettings) {
      await sql`
        INSERT INTO personalized_algorithm_settings (setting_key, setting_value, description, updated_at)
        VALUES ('behavior_tracking', ${JSON.stringify(behaviorTrackingSettings)}, 'User behavior tracking configuration', NOW())
        ON CONFLICT (setting_key)
        DO UPDATE SET 
          setting_value = ${JSON.stringify(behaviorTrackingSettings)},
          updated_at = NOW()
      `
    }

    // Save traditional algorithm settings
    if (algorithmSettings) {
      await sql`
        INSERT INTO marketplace_algorithm_settings (setting_key, setting_value, description, updated_at)
        VALUES ('algorithm_weights', ${JSON.stringify(algorithmSettings)}, 'Traditional algorithm weights', NOW())
        ON CONFLICT (setting_key)
        DO UPDATE SET 
          setting_value = ${JSON.stringify(algorithmSettings)},
          updated_at = NOW()
      `
    }

    // Save page settings
    if (pageSettings) {
      await sql`
        INSERT INTO marketplace_algorithm_settings (setting_key, setting_value, description, updated_at)
        VALUES ('page_settings', ${JSON.stringify(pageSettings)}, 'Marketplace page display settings', NOW())
        ON CONFLICT (setting_key)
        DO UPDATE SET 
          setting_value = ${JSON.stringify(pageSettings)},
          updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving algorithm settings:", error)
    return NextResponse.json({ error: "Failed to save algorithm settings" }, { status: 500 })
  }
}
