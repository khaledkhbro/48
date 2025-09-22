import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/local-redis"

interface AdminService {
  id: string
  name: string
  description: string
  price: number
  deliveryTime: number
  deliveryUnit: string
  revisions: number
  unlimitedRevisions: boolean
  images: string[]
  videoUrl?: string
  sortOrder: number
}

interface AdminSubcategory {
  id: string
  name: string
  description: string
  services: AdminService[]
  sortOrder: number
}

interface AdminCategory {
  id: string
  name: string
  description: string
  logo: string
  subcategories: AdminSubcategory[]
  sortOrder: number
}

const CACHE_KEY = "marketplace:categories"
const CACHE_TTL = 3600 // 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get("refresh") === "true"

    if (!refresh) {
      const cached = await redis.get(CACHE_KEY)
      if (cached) {
        console.log("[v0] Categories served from Redis cache")
        return NextResponse.json({
          categories: JSON.parse(cached),
          cached: true,
        })
      }
    } else {
      console.log("[v0] Cache refresh requested, clearing cache and fetching fresh data")
      await redis.del(CACHE_KEY)
    }

    // If not in cache, get from localStorage (server-side simulation)
    let categories: AdminCategory[] = []

    // In a real app, this would come from a database
    // For now, we'll use the default structure
    const defaultCategories: AdminCategory[] = [
      {
        id: "graphics-design",
        name: "Graphics & Design",
        description: "Logo & Brand Identity, Art & Illustration, Web & App Design",
        logo: "/placeholder.svg?height=100&width=100&text=Graphics",
        sortOrder: 1,
        subcategories: [
          {
            id: "logo-design",
            name: "Logo Design",
            description: "Professional logo design services",
            sortOrder: 1,
            services: [
              {
                id: "custom-logo-design",
                name: "Custom Logo Design",
                description: "Professional custom logo creation",
                price: 150,
                deliveryTime: 3,
                deliveryUnit: "days",
                revisions: 3,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Logo+Design"],
                sortOrder: 1,
              },
              {
                id: "brand-style-guides",
                name: "Brand Style Guides",
                description: "Complete brand identity packages",
                price: 300,
                deliveryTime: 5,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Brand+Guide"],
                sortOrder: 2,
              },
            ],
          },
          {
            id: "art-illustration",
            name: "Art & Illustration",
            description: "Custom artwork and illustrations",
            sortOrder: 2,
            services: [
              {
                id: "custom-illustration",
                name: "Custom Illustration",
                description: "Professional custom illustrations",
                price: 200,
                deliveryTime: 4,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Illustration"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "web-app-design",
            name: "Web & App Design",
            description: "UI/UX design for websites and mobile apps",
            sortOrder: 3,
            services: [
              {
                id: "ui-ux-design",
                name: "UI/UX Design",
                description: "Modern user interface and experience design",
                price: 400,
                deliveryTime: 5,
                deliveryUnit: "days",
                revisions: 3,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=UI+UX+Design"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "programming-tech",
        name: "Programming & Tech",
        description: "Website Development, Mobile Apps, Software Development",
        logo: "/placeholder.svg?height=100&width=100&text=Programming",
        sortOrder: 2,
        subcategories: [
          {
            id: "website-development",
            name: "Website Development",
            description: "Custom website development services",
            sortOrder: 1,
            services: [
              {
                id: "wordpress-development",
                name: "WordPress Development",
                description: "Custom WordPress development",
                price: 600,
                deliveryTime: 7,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=WordPress"],
                sortOrder: 1,
              },
              {
                id: "custom-websites",
                name: "Custom Websites",
                description: "Full-stack custom development",
                price: 1200,
                deliveryTime: 14,
                deliveryUnit: "days",
                revisions: 3,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Custom+Web"],
                sortOrder: 2,
              },
            ],
          },
          {
            id: "mobile-app-development",
            name: "Mobile App Development",
            description: "iOS and Android app development",
            sortOrder: 2,
            services: [
              {
                id: "react-native-app",
                name: "React Native App",
                description: "Cross-platform mobile app development",
                price: 2000,
                deliveryTime: 21,
                deliveryUnit: "days",
                revisions: 3,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=React+Native"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "digital-marketing",
        name: "Digital Marketing",
        description: "SEO, Social Media Marketing, PPC Advertising",
        logo: "/placeholder.svg?height=100&width=100&text=Marketing",
        sortOrder: 3,
        subcategories: [
          {
            id: "seo",
            name: "Search Engine Optimization",
            description: "SEO and search marketing",
            sortOrder: 1,
            services: [
              {
                id: "seo-audit",
                name: "SEO Audit",
                description: "Comprehensive website SEO analysis",
                price: 200,
                deliveryTime: 3,
                deliveryUnit: "days",
                revisions: 1,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=SEO+Audit"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "social-media-marketing",
            name: "Social Media Marketing",
            description: "Social platform marketing",
            sortOrder: 2,
            services: [
              {
                id: "social-media-management",
                name: "Social Media Management",
                description: "Complete social media management",
                price: 400,
                deliveryTime: 30,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Social+Media"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "writing-translation",
        name: "Writing & Translation",
        description: "Content Writing, Copywriting, Translation Services",
        logo: "/placeholder.svg?height=100&width=100&text=Writing",
        sortOrder: 4,
        subcategories: [
          {
            id: "content-writing",
            name: "Content Writing",
            description: "Articles, blogs, and web content",
            sortOrder: 1,
            services: [
              {
                id: "blog-writing",
                name: "Blog Writing",
                description: "SEO-optimized blog posts and articles",
                price: 75,
                deliveryTime: 2,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Blog+Writing"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "translation",
            name: "Translation & Localization",
            description: "Language translation services",
            sortOrder: 2,
            services: [
              {
                id: "document-translation",
                name: "Document Translation",
                description: "Professional document translation",
                price: 50,
                deliveryTime: 2,
                deliveryUnit: "days",
                revisions: 1,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Translation"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "video-animation",
        name: "Video & Animation",
        description: "Video Editing, Animation, Motion Graphics",
        logo: "/placeholder.svg?height=100&width=100&text=Video",
        sortOrder: 5,
        subcategories: [
          {
            id: "video-editing",
            name: "Video Editing",
            description: "Professional video editing services",
            sortOrder: 1,
            services: [
              {
                id: "youtube-video-editing",
                name: "YouTube Video Editing",
                description: "Professional YouTube video editing",
                price: 150,
                deliveryTime: 3,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Video+Editing"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "animation",
            name: "Animation",
            description: "2D and 3D animation services",
            sortOrder: 2,
            services: [
              {
                id: "2d-animation",
                name: "2D Animation",
                description: "Custom 2D animation creation",
                price: 400,
                deliveryTime: 7,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=2D+Animation"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "music-audio",
        name: "Music & Audio",
        description: "Voice Over, Music Production, Audio Editing",
        logo: "/placeholder.svg?height=100&width=100&text=Audio",
        sortOrder: 6,
        subcategories: [
          {
            id: "voice-over",
            name: "Voice Over",
            description: "Professional voice acting and narration",
            sortOrder: 1,
            services: [
              {
                id: "commercial-voice-over",
                name: "Commercial Voice Over",
                description: "Professional voice over for commercials",
                price: 100,
                deliveryTime: 2,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Voice+Over"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "music-production",
            name: "Music Production",
            description: "Music creation and production",
            sortOrder: 2,
            services: [
              {
                id: "custom-music",
                name: "Custom Music Production",
                description: "Original music composition and production",
                price: 300,
                deliveryTime: 7,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Music+Production"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "business",
        name: "Business",
        description: "Business Plans, Market Research, Project Management",
        logo: "/placeholder.svg?height=100&width=100&text=Business",
        sortOrder: 7,
        subcategories: [
          {
            id: "business-plans",
            name: "Business Plans",
            description: "Business planning and strategy",
            sortOrder: 1,
            services: [
              {
                id: "startup-business-plan",
                name: "Startup Business Plan",
                description: "Comprehensive business plan for startups",
                price: 300,
                deliveryTime: 5,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Business+Plan"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "market-research",
            name: "Market Research",
            description: "Industry and market analysis",
            sortOrder: 2,
            services: [
              {
                id: "market-analysis",
                name: "Market Analysis",
                description: "Comprehensive market research and analysis",
                price: 250,
                deliveryTime: 4,
                deliveryUnit: "days",
                revisions: 1,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Market+Research"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "ai-services",
        name: "AI Services",
        description: "AI Development, Machine Learning, Chatbots",
        logo: "/placeholder.svg?height=100&width=100&text=AI",
        sortOrder: 8,
        subcategories: [
          {
            id: "ai-development",
            name: "AI Development",
            description: "Custom AI solutions",
            sortOrder: 1,
            services: [
              {
                id: "chatbot-development",
                name: "Chatbot Development",
                description: "Custom AI chatbot development",
                price: 600,
                deliveryTime: 7,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=AI+Chatbot"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "machine-learning",
            name: "Machine Learning",
            description: "ML models and algorithms",
            sortOrder: 2,
            services: [
              {
                id: "ml-model-development",
                name: "ML Model Development",
                description: "Custom machine learning model creation",
                price: 800,
                deliveryTime: 10,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=ML+Model"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "lifestyle",
        name: "Lifestyle",
        description: "Gaming, Travel, Fitness, Relationship Advice",
        logo: "/placeholder.svg?height=100&width=100&text=Lifestyle",
        sortOrder: 9,
        subcategories: [
          {
            id: "fitness",
            name: "Fitness & Wellness",
            description: "Health and fitness coaching",
            sortOrder: 1,
            services: [
              {
                id: "workout-plan",
                name: "Custom Workout Plan",
                description: "Personalized fitness and workout plans",
                price: 80,
                deliveryTime: 3,
                deliveryUnit: "days",
                revisions: 1,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Workout+Plan"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "gaming",
            name: "Gaming",
            description: "Gaming and esports services",
            sortOrder: 2,
            services: [
              {
                id: "gaming-coaching",
                name: "Gaming Coaching",
                description: "Professional gaming lessons and coaching",
                price: 50,
                deliveryTime: 1,
                deliveryUnit: "days",
                revisions: 0,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Gaming+Coach"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "photography",
        name: "Photography",
        description: "Photo Editing, Product Photography, Portrait Photography",
        logo: "/placeholder.svg?height=100&width=100&text=Photography",
        sortOrder: 10,
        subcategories: [
          {
            id: "photo-editing",
            name: "Photo Editing",
            description: "Professional photo editing services",
            sortOrder: 1,
            services: [
              {
                id: "photo-retouching",
                name: "Photo Retouching",
                description: "Professional photo enhancement and retouching",
                price: 25,
                deliveryTime: 1,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Photo+Retouching"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "product-photography",
            name: "Product Photography",
            description: "E-commerce product photos",
            sortOrder: 2,
            services: [
              {
                id: "ecommerce-photos",
                name: "E-commerce Product Photos",
                description: "Professional product photography for online stores",
                price: 150,
                deliveryTime: 3,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Product+Photos"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "architecture-engineering",
        name: "Architecture & Engineering",
        description: "CAD Design, 3D Modeling, Technical Drawings",
        logo: "/placeholder.svg?height=100&width=100&text=Architecture",
        sortOrder: 11,
        subcategories: [
          {
            id: "cad-design",
            name: "CAD Design",
            description: "Professional CAD design services",
            sortOrder: 1,
            services: [
              {
                id: "3d-cad-modeling",
                name: "3D CAD Modeling",
                description: "Professional 3D CAD design and modeling",
                price: 200,
                deliveryTime: 4,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=CAD+Design"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "technical-drawings",
            name: "Technical Drawings",
            description: "Engineering drawings and blueprints",
            sortOrder: 2,
            services: [
              {
                id: "engineering-drawings",
                name: "Engineering Drawings",
                description: "Professional technical drawings and blueprints",
                price: 150,
                deliveryTime: 3,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Technical+Drawing"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "data-analytics",
        name: "Data & Analytics",
        description: "Data Analysis, Business Intelligence, Data Visualization",
        logo: "/placeholder.svg?height=100&width=100&text=Data",
        sortOrder: 12,
        subcategories: [
          {
            id: "data-analysis",
            name: "Data Analysis",
            description: "Statistical analysis and insights",
            sortOrder: 1,
            services: [
              {
                id: "statistical-analysis",
                name: "Statistical Analysis",
                description: "Professional data analysis and statistical modeling",
                price: 300,
                deliveryTime: 5,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Data+Analysis"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "data-visualization",
            name: "Data Visualization",
            description: "Charts, dashboards, and visual reports",
            sortOrder: 2,
            services: [
              {
                id: "dashboard-creation",
                name: "Dashboard Creation",
                description: "Interactive dashboards and data visualizations",
                price: 250,
                deliveryTime: 4,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Dashboard"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
      {
        id: "consulting-coaching",
        name: "Consulting & Coaching",
        description: "Business Consulting, Life Coaching, Career Advice",
        logo: "/placeholder.svg?height=100&width=100&text=Consulting",
        sortOrder: 13,
        subcategories: [
          {
            id: "business-consulting",
            name: "Business Consulting",
            description: "Strategic business advice and consulting",
            sortOrder: 1,
            services: [
              {
                id: "strategy-consulting",
                name: "Strategy Consulting",
                description: "Business strategy development and consulting",
                price: 200,
                deliveryTime: 3,
                deliveryUnit: "days",
                revisions: 2,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Strategy+Consulting"],
                sortOrder: 1,
              },
            ],
          },
          {
            id: "life-coaching",
            name: "Life Coaching",
            description: "Personal development and life coaching",
            sortOrder: 2,
            services: [
              {
                id: "personal-coaching",
                name: "Personal Life Coaching",
                description: "One-on-one life coaching sessions",
                price: 100,
                deliveryTime: 1,
                deliveryUnit: "days",
                revisions: 0,
                unlimitedRevisions: false,
                images: ["/placeholder.svg?height=300&width=400&text=Life+Coaching"],
                sortOrder: 1,
              },
            ],
          },
        ],
      },
    ]

    categories = defaultCategories

    // Cache the result in Redis
    await redis.set(CACHE_KEY, JSON.stringify(categories), CACHE_TTL)
    console.log("[v0] Categories cached in Redis for", CACHE_TTL, "seconds")

    return NextResponse.json({
      categories,
      cached: false,
    })
  } catch (error) {
    console.error("[v0] Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const categories = await request.json()

    await redis.del(CACHE_KEY)
    console.log("[v0] Cache cleared before updating categories")

    // Save to cache with fresh data
    await redis.set(CACHE_KEY, JSON.stringify(categories), CACHE_TTL)
    console.log("[v0] Categories updated in Redis cache")

    // In a real app, you would also save to database here

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating categories:", error)
    return NextResponse.json({ error: "Failed to update categories" }, { status: 500 })
  }
}

// Clear cache endpoint
export async function DELETE() {
  try {
    await redis.del(CACHE_KEY)
    console.log("[v0] Categories cache cleared")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error clearing cache:", error)
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 })
  }
}
