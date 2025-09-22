"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"

interface MarketplaceContextType {
  isInitialized: boolean
  isLoading: boolean
  categories: MarketplaceCategory[]
  isUserInVacationMode: (userId: string) => boolean
}

interface MarketplaceCategory {
  id: string
  name: string
  slug: string
  description?: string
  logo?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  subcategories: MarketplaceSubcategory[]
}

interface MarketplaceSubcategory {
  id: string
  categoryId: string
  name: string
  slug: string
  description?: string
  logo?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  microCategories?: MarketplaceMicroCategory[]
  services?: MarketplaceService[]
}

interface MarketplaceMicroCategory {
  id: string
  subcategoryId: string
  name: string
  slug: string
  description?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

interface MarketplaceService {
  id: string
  subcategoryId: string
  name: string
  slug: string
  description?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  price?: number
  deliveryTime?: { value: number; unit: string }
  revisionsIncluded?: number
  images?: string[]
}

const MarketplaceContext = createContext<MarketplaceContextType>({
  isInitialized: false,
  isLoading: true,
  categories: [],
  isUserInVacationMode: () => false,
})

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])

  const isUserInVacationMode = useCallback((userId: string) => {
    if (typeof window === "undefined") return false
    try {
      const vacationMode = localStorage.getItem(`vacation_mode_${userId}`)
      return vacationMode === "true"
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initializeData = async () => {
      console.log("[v0] MarketplaceProvider initializing...")
      console.log("[v0] Current state - isInitialized:", isInitialized, "isLoading:", isLoading)

      // Prevent multiple initializations
      if (isInitialized) {
        console.log("[v0] Already initialized, skipping...")
        return
      }

      try {
        let loadedCategories: MarketplaceCategory[] = []

        try {
          console.log("[v0] Fetching categories from API...")
          const response = await fetch("/api/marketplace/categories")
          if (response.ok) {
            const data = await response.json()
            if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
              console.log("[v0] Successfully loaded categories from API:", data.categories.length)
              loadedCategories = transformApiCategories(data.categories)
            }
          } else {
            console.warn("[v0] API request failed with status:", response.status)
          }
        } catch (apiError) {
          console.warn("[v0] Error fetching from API:", apiError)
        }

        if (loadedCategories.length === 0 && typeof window !== "undefined") {
          try {
            const existingCategories = localStorage.getItem("marketplace_categories")
            if (existingCategories) {
              const parsedCategories = JSON.parse(existingCategories)
              if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
                console.log("[v0] Loaded existing categories from localStorage:", parsedCategories.length)
                loadedCategories = parsedCategories
              }
            }
          } catch (error) {
            console.warn("[v0] Error loading existing categories:", error)
          }
        }

        if (loadedCategories.length === 0) {
          console.log("[v0] Using default categories as final fallback...")
          loadedCategories = getDefaultCategories()
        }

        if (typeof window !== "undefined" && loadedCategories.length > 0) {
          try {
            localStorage.setItem("marketplace_categories", JSON.stringify(loadedCategories))
          } catch (storageError) {
            console.warn("[v0] Could not save to localStorage:", storageError)
          }
        }

        // Only update state if component is still mounted
        if (isMounted) {
          console.log("[v0] Setting categories and completing initialization...")
          setCategories(loadedCategories)
          setIsInitialized(true)
          setIsLoading(false)
          console.log("[v0] MarketplaceProvider initialization complete - categories:", loadedCategories.length)
        }
      } catch (error) {
        console.error("[v0] Failed to initialize marketplace data:", error)
        // Even if initialization fails, set default state to prevent infinite loading
        if (isMounted) {
          const defaultCategories = getDefaultCategories()
          setCategories(defaultCategories)
          setIsInitialized(true)
          setIsLoading(false)
          console.log("[v0] Fallback initialization complete")
        }
      }
    }

    initializeData()

    return () => {
      isMounted = false
    }
  }, []) // Empty dependency array to run only once

  const transformApiCategories = useCallback((apiCategories: any[]): MarketplaceCategory[] => {
    return apiCategories.map((apiCat, index) => ({
      id: apiCat.id,
      name: apiCat.name,
      slug: apiCat.id, // Use id as slug if slug not provided
      description: apiCat.description,
      logo: apiCat.logo,
      sortOrder: apiCat.sortOrder || index + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      subcategories: (apiCat.subcategories || []).map((apiSub: any, subIndex: number) => ({
        id: apiSub.id,
        categoryId: apiCat.id,
        name: apiSub.name,
        slug: apiSub.id,
        description: apiSub.description,
        logo: apiSub.logo,
        sortOrder: apiSub.sortOrder || subIndex + 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        microCategories: [], // API doesn't have micro categories, but our interface expects them
        services: (apiSub.services || []).map((apiService: any, serviceIndex: number) => ({
          id: apiService.id,
          subcategoryId: apiSub.id,
          name: apiService.name,
          slug: apiService.id,
          description: apiService.description,
          sortOrder: apiService.sortOrder || serviceIndex + 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          price: apiService.price,
          deliveryTime:
            apiService.deliveryTime && apiService.deliveryUnit
              ? { value: apiService.deliveryTime, unit: apiService.deliveryUnit }
              : undefined,
          revisionsIncluded: apiService.revisions,
          images: apiService.images || [],
        })),
      })),
    }))
  }, [])

  const getDefaultCategories = useCallback((): MarketplaceCategory[] => {
    return [
      {
        id: "graphics-design",
        name: "Graphics & Design",
        slug: "graphics-design",
        description: "Logo & Brand Identity, Art & Illustration, Web & App Design",
        logo: "/placeholder.svg?height=100&width=100&text=Graphics",
        sortOrder: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "logo-design",
            categoryId: "graphics-design",
            name: "Logo Design",
            slug: "logo-design",
            description: "Professional logo design services",
            logo: "/placeholder.svg?height=100&width=100&text=Logo",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            microCategories: [
              {
                id: "business-logo",
                subcategoryId: "logo-design",
                name: "Business Logo",
                slug: "business-logo",
                description: "Professional business logos",
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
              {
                id: "minimalist-logo",
                subcategoryId: "logo-design",
                name: "Minimalist Logo",
                slug: "minimalist-logo",
                description: "Clean, minimalist logo designs",
                sortOrder: 2,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: "brand-identity",
            categoryId: "graphics-design",
            name: "Brand Identity & Guidelines",
            slug: "brand-identity",
            description: "Complete brand identity packages",
            logo: "/placeholder.svg?height=100&width=100&text=Brand",
            sortOrder: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
            microCategories: [
              {
                id: "brand-package",
                subcategoryId: "brand-identity",
                name: "Brand Package",
                slug: "brand-package",
                description: "Complete brand identity package",
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "web-development",
        name: "Web Development",
        slug: "web-development",
        description: "Website Development, E-commerce, Mobile Apps",
        logo: "/placeholder.svg?height=100&width=100&text=Web",
        sortOrder: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "website-development",
            categoryId: "web-development",
            name: "Website Development",
            slug: "website-development",
            description: "Custom website development services",
            logo: "/placeholder.svg?height=100&width=100&text=Website",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            microCategories: [
              {
                id: "react-development",
                subcategoryId: "website-development",
                name: "React Development",
                slug: "react-development",
                description: "Modern React website development",
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
              {
                id: "wordpress-development",
                subcategoryId: "website-development",
                name: "WordPress Development",
                slug: "wordpress-development",
                description: "Custom WordPress websites",
                sortOrder: 2,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        id: "writing-translation",
        name: "Writing & Translation",
        slug: "writing-translation",
        description: "Content Writing, Copywriting, Translation Services",
        logo: "/placeholder.svg?height=100&width=100&text=Writing",
        sortOrder: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        subcategories: [
          {
            id: "content-writing",
            categoryId: "writing-translation",
            name: "Content Writing",
            slug: "content-writing",
            description: "Blog posts, articles, and web content",
            logo: "/placeholder.svg?height=100&width=100&text=Content",
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            microCategories: [
              {
                id: "blog-writing",
                subcategoryId: "content-writing",
                name: "Blog Writing",
                slug: "blog-writing",
                description: "SEO-optimized blog posts and articles",
                sortOrder: 1,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
              {
                id: "copywriting",
                subcategoryId: "content-writing",
                name: "Copywriting",
                slug: "copywriting",
                description: "Sales and marketing copy",
                sortOrder: 2,
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    ]
  }, [])

  const contextValue = useMemo(() => {
    console.log(
      "[v0] Context value updated - isInitialized:",
      isInitialized,
      "isLoading:",
      isLoading,
      "categories:",
      categories.length,
    )
    return {
      isInitialized,
      isLoading,
      categories,
      isUserInVacationMode,
    }
  }, [isInitialized, isLoading, categories, isUserInVacationMode])

  return <MarketplaceContext.Provider value={contextValue}>{children}</MarketplaceContext.Provider>
}

export const useMarketplace = () => useContext(MarketplaceContext)
