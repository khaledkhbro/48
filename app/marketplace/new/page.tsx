"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createService } from "@/lib/marketplace"
import { useMarketplace } from "@/components/marketplace/marketplace-provider"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, X, AlertCircle, CheckCircle, Clock, UserX, FileText, FileUp, Info } from "lucide-react"
import type { MarketplaceSubcategory, MarketplaceMicroCategory } from "@/lib/marketplace-categories"
import Link from "next/link"

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

interface ServiceTier {
  id: string
  name: string
  price: number
  deliveryTimeValue: number
  deliveryTimeUnit: "instant" | "minutes" | "hours" | "days"
  revisionsIncluded: number
  isUnlimitedRevisions: boolean
  description: string
  features: string[]
}

interface ServiceAddOn {
  id: string
  name: string
  description: string
  price: number
  deliveryTimeValue: number
  deliveryTimeUnit: "instant" | "minutes" | "hours" | "days"
}

interface FileUploadProps {
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
  showPreview?: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesChange,
  maxFiles = 5,
  maxSize = 5,
  acceptedTypes = ["image/*"],
  showPreview = true,
}) => {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])

    if (selectedFiles.length === 0) return

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files.`)
      return
    }

    for (const file of selectedFiles) {
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the maximum size of ${maxSize}MB.`)
        return
      }

      if (!acceptedTypes.some((type) => file.type.startsWith(type.split("/")[0]))) {
        setError(`File "${file.name}" has an unsupported file type.`)
        return
      }
    }

    setError(null)
    const newFiles = [...files, ...selectedFiles]
    setFiles(newFiles)
    onFilesChange(newFiles)
  }

  const removeFile = (indexToRemove: number) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        multiple
        accept={acceptedTypes.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="file-upload"
        className="relative cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm py-2 px-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 block w-full text-sm font-medium text-gray-700 text-center"
      >
        <FileUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        Choose Files
      </label>
      {error && <Alert variant="destructive">{error}</Alert>}

      {showPreview && files.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          {files.map((file, index) => (
            <div key={index} className="relative">
              {file.type.startsWith("image") ? (
                <img
                  src={URL.createObjectURL(file) || "/placeholder.svg"}
                  alt={file.name}
                  className="w-full h-32 object-cover rounded-md"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
                  <p className="text-sm text-gray-500">File: {file.name}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 bg-gray-200 rounded-full p-1 hover:bg-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CreateServicePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { categories, isLoading: contextLoading, isInitialized } = useMarketplace()
  const { toast } = useToast()

  const [isServiceProvider, setIsServiceProvider] = useState<boolean | null>(null)
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null)
  const [checkingApproval, setCheckingApproval] = useState(true)

  console.log(
    "[v0] CreateServicePage render - user:",
    !!user,
    "contextLoading:",
    contextLoading,
    "isInitialized:",
    isInitialized,
    "categories:",
    categories?.length || 0,
  )

  const [serviceLoading, setServiceLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [availableSubcategories, setAvailableSubcategories] = useState<MarketplaceSubcategory[]>([])
  const [availableMicroCategories, setAvailableMicroCategories] = useState<MarketplaceMicroCategory[]>([])

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    microCategoryId: "",
    requirements: "",
    tags: [] as string[],
    images: [] as File[],
    videoThumbnailType: "" as "youtube" | "vimeo" | "direct" | "",
    videoThumbnailUrl: "",
    serviceTiers: [] as ServiceTier[],
    serviceAddOns: [] as ServiceAddOn[],
  })
  const [newTag, setNewTag] = useState("")

  const [isCreatingTier, setIsCreatingTier] = useState(false)
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [isCreatingAddOn, setIsCreatingAddOn] = useState(false)
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const checkServiceProviderStatus = async () => {
      if (!user || !isAuthenticated) return

      try {
        const settingsResponse = await fetch("/api/admin/settings/service-provider")
        const settingsData = await settingsResponse.json()
        const requireApproval = settingsData.setting?.setting_value === "true"

        // If approval is not required, allow anyone to create services
        if (!requireApproval) {
          setIsServiceProvider(true)
          setApplicationStatus("approved")
          setCheckingApproval(false)
          return
        }

        // If approval is required, check user's application status
        const response = await fetch(`/api/service-provider-applications?userId=${user.id}`)

        if (!response.ok) {
          console.error(`API returned ${response.status}: ${response.statusText}`)
          setIsServiceProvider(false)
          setApplicationStatus(null)
          return
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.error("API returned non-JSON response:", contentType)
          setIsServiceProvider(false)
          setApplicationStatus(null)
          return
        }

        const data = await response.json()

        if (data.applications && data.applications.length > 0) {
          const latestApplication = data.applications[0]
          setApplicationStatus(latestApplication.status)
          setIsServiceProvider(latestApplication.status === "approved")
        } else {
          setIsServiceProvider(false)
          setApplicationStatus(null)
        }
      } catch (error) {
        console.error("Error checking service provider status:", error)
        setIsServiceProvider(false)
      } finally {
        setCheckingApproval(false)
      }
    }

    if (user && isAuthenticated) {
      checkServiceProviderStatus()
    }
  }, [user, isAuthenticated])

  useEffect(() => {
    console.log("[v0] Categories from context:", categories?.length || 0)
    if (categories && categories.length > 0) {
      console.log("[v0] First category from context:", categories[0]?.name)
      console.log(
        "[v0] Categories with subcategories:",
        categories.map((cat) => ({
          name: cat.name,
          subcategoriesCount: cat.subcategories?.length || 0,
        })),
      )
    }
  }, [categories])

  useEffect(() => {
    if (formData.categoryId && categories) {
      const selectedCategory = categories.find((cat) => cat.id === formData.categoryId)
      if (selectedCategory && Array.isArray(selectedCategory.subcategories)) {
        setAvailableSubcategories(selectedCategory.subcategories)
      } else {
        setAvailableSubcategories([])
      }
      setFormData((prev) => ({ ...prev, subcategoryId: "", microCategoryId: "" }))
    } else {
      setAvailableSubcategories([])
    }
  }, [formData.categoryId, categories])

  useEffect(() => {
    if (formData.subcategoryId) {
      const selectedSubcategory = availableSubcategories.find((sub) => sub.id === formData.subcategoryId)
      if (selectedSubcategory && Array.isArray(selectedSubcategory.microCategories)) {
        console.log(
          "[v0] Loading micro categories for subcategory:",
          selectedSubcategory.name,
          selectedSubcategory.microCategories.length,
        )
        setAvailableMicroCategories(selectedSubcategory.microCategories)
      } else {
        console.log("[v0] No micro categories found for subcategory:", formData.subcategoryId)
        setAvailableMicroCategories([])
      }
      setFormData((prev) => ({ ...prev, microCategoryId: "" }))
    } else {
      setAvailableMicroCategories([])
    }
  }, [formData.subcategoryId, availableSubcategories])

  // Now the conditional returns come after all hooks
  if (checkingApproval) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your service provider status...</p>
        </div>
      </div>
    )
  }

  if (isServiceProvider === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/marketplace">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Marketplace
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Service Provider Application Required</h1>
                <p className="text-gray-600">You need to be approved as a service provider to create services</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {applicationStatus === null ? (
              // No application submitted
              <Card>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <UserX className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Apply to Become a Service Provider</CardTitle>
                  <CardDescription>
                    Before you can create and sell services on our marketplace, you need to apply and get approved as a
                    service provider.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Note:</strong> Our marketplace currently requires admin approval for service providers.
                      This helps maintain quality and trust in our platform.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">What you'll need to provide:</h3>
                    <ul className="text-blue-700 space-y-1 text-sm">
                      <li>• Your skills and experience details</li>
                      <li>• Education certificates (if applicable)</li>
                      <li>• Portfolio links and work samples</li>
                      <li>• External platform profiles (Fiverr, Upwork, etc.) for faster verification</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">Benefits of being approved:</h3>
                    <ul className="text-green-700 space-y-1 text-sm">
                      <li>• Create and sell unlimited services</li>
                      <li>• Access to advanced seller tools</li>
                      <li>• Verified service provider badge</li>
                      <li>• Priority customer support</li>
                    </ul>
                  </div>

                  <div className="flex justify-center">
                    <Button asChild size="lg">
                      <Link href="/marketplace/apply">
                        <FileText className="h-4 w-4 mr-2" />
                        Apply Now
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Application submitted but not approved
              <Card>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    {applicationStatus === "pending" && <Clock className="h-8 w-8 text-orange-600" />}
                    {applicationStatus === "under_review" && <FileText className="h-8 w-8 text-blue-600" />}
                    {applicationStatus === "rejected" && <UserX className="h-8 w-8 text-red-600" />}
                    {applicationStatus === "needs_more_info" && <AlertCircle className="h-8 w-8 text-yellow-600" />}
                  </div>
                  <CardTitle className="text-xl">
                    {applicationStatus === "pending" && "Application Under Review"}
                    {applicationStatus === "under_review" && "Application Being Reviewed"}
                    {applicationStatus === "rejected" && "Application Not Approved"}
                    {applicationStatus === "needs_more_info" && "Additional Information Required"}
                  </CardTitle>
                  <CardDescription>
                    {applicationStatus === "pending" &&
                      "Your service provider application is pending review by our admin team."}
                    {applicationStatus === "under_review" && "Our admin team is currently reviewing your application."}
                    {applicationStatus === "rejected" &&
                      "Unfortunately, your service provider application was not approved."}
                    {applicationStatus === "needs_more_info" &&
                      "Our admin team needs additional information to process your application."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {applicationStatus === "pending" && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
                      <ul className="text-blue-700 space-y-1 text-sm">
                        <li>• Our admin team will review your application within 2-3 business days</li>
                        <li>• We'll verify your portfolio links and external platform profiles</li>
                        <li>• You'll receive an email notification about the status</li>
                        <li>• Once approved, you can start creating services immediately</li>
                      </ul>
                    </div>
                  )}

                  {applicationStatus === "under_review" && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">Review in Progress</h3>
                      <p className="text-blue-700 text-sm">
                        Our admin team is currently reviewing your application. You should hear back from us within 1-2
                        business days.
                      </p>
                    </div>
                  )}

                  {applicationStatus === "rejected" && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-2">Next Steps</h3>
                      <p className="text-red-700 text-sm mb-3">
                        You can submit a new application with improved information or contact our support team for
                        feedback.
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/marketplace/apply">Submit New Application</Link>
                      </Button>
                    </div>
                  )}

                  {applicationStatus === "needs_more_info" && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 mb-2">Action Required</h3>
                      <p className="text-yellow-700 text-sm mb-3">
                        Please check your email or dashboard for details about what additional information is needed.
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard">Go to Dashboard</Link>
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-center space-x-4">
                    <Button asChild variant="outline">
                      <Link href="/marketplace">Browse Marketplace</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (contextLoading || !isInitialized) {
    console.log("[v0] Showing loading spinner - contextLoading:", contextLoading, "isInitialized:", isInitialized)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !isLoading) {
    router.push("/login?redirect=/marketplace/new")
    return null
  }

  if (!categories || categories.length === 0) {
    console.log("[v0] Showing marketplace not available - categories:", categories?.length || 0)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Marketplace Not Available</h1>
          <p className="text-gray-600 mb-4">
            The marketplace categories are not loaded. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    )
  }

  console.log("[v0] Rendering form - all conditions passed")

  const addTag = () => {
    if (newTag.trim() && formData.tags.length < 10) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  const createDefaultTier = (tierType: "starter" | "standard" | "advanced"): ServiceTier => {
    const tierNames = {
      starter: "Starter",
      standard: "Standard",
      advanced: "Advanced",
    }

    const tierPrices = {
      starter: 25,
      standard: 50,
      advanced: 100,
    }

    const tierDescriptions = {
      starter: "Perfect for basic projects with essential features and quick delivery.",
      standard: "Ideal for most projects with enhanced features and faster turnaround.",
      advanced: "Premium package with comprehensive features and priority support.",
    }

    const tierFeatures = {
      starter: ["Basic implementation", "Standard delivery time"],
      standard: ["Enhanced implementation", "Faster delivery", "1 revision included"],
      advanced: ["Premium implementation", "Express delivery", "3 revisions included", "Source files included"],
    }

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: tierNames[tierType],
      price: tierPrices[tierType],
      deliveryTimeValue: tierType === "starter" ? 5 : tierType === "standard" ? 3 : 1,
      deliveryTimeUnit: "days",
      revisionsIncluded: tierType === "starter" ? 1 : tierType === "standard" ? 2 : 3,
      isUnlimitedRevisions: false,
      description: tierDescriptions[tierType],
      features: tierFeatures[tierType],
    }
  }

  const validateServiceTiers = (): string[] => {
    const errors: string[] = []

    if (formData.serviceTiers.length === 0) {
      errors.push("At least one service tier is required")
      return errors
    }

    formData.serviceTiers.forEach((tier, index) => {
      const tierLabel = `Tier ${index + 1} (${tier.name || "Unnamed"})`

      if (!tier.name.trim()) {
        errors.push(`${tierLabel}: Name is required`)
      }

      if (tier.price < 5) {
        errors.push(`${tierLabel}: Price must be at least $5`)
      }

      if (tier.price > 10000) {
        errors.push(`${tierLabel}: Price cannot exceed $10,000`)
      }

      if (!tier.description.trim()) {
        errors.push(`${tierLabel}: Description is required`)
      }

      if (tier.description.length < 20) {
        errors.push(`${tierLabel}: Description must be at least 20 characters`)
      }

      const validFeatures = tier.features.filter((f) => f.trim())
      if (validFeatures.length === 0) {
        errors.push(`${tierLabel}: At least one feature is required`)
      }

      if (tier.deliveryTimeUnit !== "instant" && tier.deliveryTimeValue < 1) {
        errors.push(`${tierLabel}: Delivery time must be at least 1 ${tier.deliveryTimeUnit}`)
      }

      if (!tier.isUnlimitedRevisions && tier.revisionsIncluded < 0) {
        errors.push(`${tierLabel}: Revisions included cannot be negative`)
      }
    })

    // Check for price progression (each tier should be more expensive than the previous)
    if (formData.serviceTiers.length > 1) {
      const sortedTiers = [...formData.serviceTiers].sort((a, b) => a.price - b.price)
      const originalOrder = formData.serviceTiers.map((t) => t.price)
      const sortedOrder = sortedTiers.map((t) => t.price)

      if (JSON.stringify(originalOrder) !== JSON.stringify(sortedOrder)) {
        errors.push("Tier prices should increase from first to last tier for better user experience")
      }
    }

    return errors
  }

  const addServiceTier = (tierType?: "starter" | "standard" | "advanced") => {
    if (formData.serviceTiers.length >= 3) return

    const newTier = tierType
      ? createDefaultTier(tierType)
      : {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: formData.serviceTiers.length === 0 ? "Basic" : `Tier ${formData.serviceTiers.length + 1}`,
          price: 25,
          deliveryTimeValue: 3,
          deliveryTimeUnit: "days" as const,
          revisionsIncluded: 2,
          isUnlimitedRevisions: false,
          description: "",
          features: [""],
        }

    setFormData((prev) => ({
      ...prev,
      serviceTiers: [...prev.serviceTiers, newTier],
    }))
    setEditingTierId(newTier.id)
    setIsCreatingTier(true)
  }

  const updateServiceTier = (tierId: string, updates: Partial<ServiceTier>) => {
    setFormData((prev) => ({
      ...prev,
      serviceTiers: prev.serviceTiers.map((tier) => (tier.id === tierId ? { ...tier, ...updates } : tier)),
    }))
  }

  const removeServiceTier = (tierId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceTiers: prev.serviceTiers.filter((tier) => tier.id !== tierId),
    }))
  }

  const addTierFeature = (tierId: string) => {
    const tier = formData.serviceTiers.find((t) => t.id === tierId)
    if (!tier) return

    // Limit to 10 features per tier
    if (tier.features.length >= 10) {
      alert("Maximum 10 features allowed per tier")
      return
    }

    updateServiceTier(tierId, {
      features: [...tier.features, ""],
    })
  }

  const updateTierFeature = (tierId: string, featureIndex: number, value: string) => {
    const tier = formData.serviceTiers.find((t) => t.id === tierId)
    if (!tier) return

    // Limit feature length
    if (value.length > 100) {
      value = value.substring(0, 100)
    }

    const newFeatures = [...tier.features]
    newFeatures[featureIndex] = value
    updateServiceTier(tierId, { features: newFeatures })
  }

  const removeTierFeature = (tierId: string, featureIndex: number) => {
    const tier = formData.serviceTiers.find((t) => t.id === tierId)
    if (!tier) return

    // Don't allow removing the last feature
    if (tier.features.filter((f) => f.trim()).length <= 1) {
      alert("At least one feature is required per tier")
      return
    }

    const newFeatures = tier.features.filter((_, index) => index !== featureIndex)
    updateServiceTier(tierId, { features: newFeatures })
  }

  const addServiceAddOn = () => {
    const newAddOn: ServiceAddOn = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: "",
      description: "",
      price: 10,
      deliveryTimeValue: 1,
      deliveryTimeUnit: "days",
    }

    setFormData((prev) => ({
      ...prev,
      serviceAddOns: [...prev.serviceAddOns, newAddOn],
    }))
    setEditingAddOnId(newAddOn.id)
    setIsCreatingAddOn(true)
  }

  const updateServiceAddOn = (addOnId: string, updates: Partial<ServiceAddOn>) => {
    setFormData((prev) => ({
      ...prev,
      serviceAddOns: prev.serviceAddOns.map((addOn) => (addOn.id === addOnId ? { ...addOn, ...updates } : addOn)),
    }))
  }

  const removeServiceAddOn = (addOnId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceAddOns: prev.serviceAddOns.filter((addOn) => addOn.id !== addOnId),
    }))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilesChange = (files: File[]) => {
    setFormData((prev) => ({ ...prev, images: files }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServiceLoading(true)

    try {
      if (!user) {
        throw new Error("You must be logged in to create a service")
      }

      if (!formData.requirements.trim()) {
        throw new Error("Buyer requirements are required")
      }

      if (formData.tags.length === 0) {
        throw new Error("At least one search tag is required")
      }

      const tierErrors = validateServiceTiers()
      if (tierErrors.length > 0) {
        throw new Error(`Service tier issues:\n${tierErrors.join("\n")}`)
      }

      const selectedCategory = categories.find((cat) => cat.id === formData.categoryId)
      if (!selectedCategory) {
        throw new Error("Please select a valid category")
      }

      const selectedSubcategory = selectedCategory.subcategories?.find((sub) => sub.id === formData.subcategoryId)
      if (!selectedSubcategory) {
        throw new Error("Please select a valid subcategory")
      }

      let selectedMicroCategory = null
      if (selectedSubcategory.microCategories && selectedSubcategory.microCategories.length > 0) {
        if (!formData.microCategoryId) {
          throw new Error("Please select a micro category from the available options")
        }
        selectedMicroCategory = selectedSubcategory.microCategories.find(
          (microCat) => microCat.id === formData.microCategoryId,
        )
        if (!selectedMicroCategory) {
          throw new Error("Please select a valid micro category")
        }
      }

      if (formData.images.length === 0) {
        throw new Error("At least one service image is required")
      }

      const imageUrls = formData.images.map((file, index) => URL.createObjectURL(file))

      const videoThumbnail =
        formData.videoThumbnailUrl && formData.videoThumbnailType
          ? {
              type: formData.videoThumbnailType,
              url: formData.videoThumbnailUrl,
            }
          : undefined

      const serviceData = {
        sellerId: user.id,
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId,
        microCategoryId: formData.microCategoryId || null,
        title: formData.title,
        description: formData.description,
        price: formData.serviceTiers[0]?.price || 0,
        deliveryTime: {
          value: formData.serviceTiers[0]?.deliveryTimeValue || 0,
          unit: formData.serviceTiers[0]?.deliveryTimeUnit || "days",
        },
        revisionsIncluded: formData.serviceTiers[0]?.isUnlimitedRevisions
          ? -1
          : formData.serviceTiers[0]?.revisionsIncluded || 0,
        images: imageUrls,
        videoThumbnail,
        tags: formData.tags,
        requirements: formData.requirements,
        serviceTiers: formData.serviceTiers,
        serviceAddOns: formData.serviceAddOns,
        status: "active" as const,
        rating: 0,
        totalOrders: 0,
        viewsCount: 0,
        category: {
          id: selectedCategory.id,
          name: selectedCategory.name,
          slug: selectedCategory.slug,
        },
        subcategory: {
          id: selectedSubcategory.id,
          name: selectedSubcategory.name,
          slug: selectedSubcategory.slug,
        },
        microCategory: selectedMicroCategory
          ? {
              id: selectedMicroCategory.id,
              name: selectedMicroCategory.name,
              slug: selectedMicroCategory.slug,
            }
          : null,
        seller: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          rating: 5.0,
          totalReviews: 0,
          isVerified: user.isVerified || false,
        },
      }

      const newService = await createService(serviceData)

      console.log("[v0] Service created successfully:", newService)
      toast({
        title: "Success!",
        description: "Your service has been created successfully.",
      })
      router.push("/dashboard/services")
    } catch (error) {
      console.error("Failed to create service:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setServiceLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        const basicRequirements =
          formData.title.trim().length >= 10 &&
          formData.description.trim().length >= 50 &&
          formData.categoryId !== "" &&
          formData.subcategoryId !== ""

        // If micro categories are available for the selected subcategory, one must be selected
        const microCategoryRequirement = availableMicroCategories.length === 0 || formData.microCategoryId !== ""

        return basicRequirements && microCategoryRequirement
      case 2:
        return formData.images.length > 0
      case 3:
        return formData.serviceTiers.length > 0 && validateServiceTiers().length === 0
      case 4:
        return formData.requirements.trim().length > 0 && formData.tags.length > 0
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Marketplace
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Service</h1>
              <p className="text-gray-600">Share your skills and start earning</p>
            </div>
            <div className="ml-auto">
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved Service Provider
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-8">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step}
                  </div>
                  <div className="ml-3 text-sm">
                    <p className={`font-medium ${step <= currentStep ? "text-blue-600" : "text-gray-500"}`}>
                      {step === 1 && "Basic Info"}
                      {step === 2 && "Service Details"}
                      {step === 3 && "Pricing"}
                      {step === 4 && "Requirements & Tags"}
                    </p>
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-0.5 ml-8 ${step < currentStep ? "bg-blue-600" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>

                {/* Service Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.title.length > 0 && formData.title.length < 10 ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="I will create a professional logo design for your business"
                    maxLength={80}
                  />
                  <p className="text-sm text-gray-500 mt-1">{formData.title.length}/80 characters</p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Description *
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none ${
                      formData.description.length > 0 && formData.description.length < 50
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Describe what you'll deliver and what makes your service unique. Include your process, what's included, and any special expertise you bring."
                    maxLength={1200}
                  />
                  <p className="text-sm text-gray-500 mt-1">{formData.description.length}/1200 characters</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => handleInputChange("categoryId", value)}
                    >
                      <SelectTrigger className={!formData.categoryId ? "border-red-300" : ""}>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subcategory *</Label>
                    <Select
                      value={formData.subcategoryId}
                      onValueChange={(value) => handleInputChange("subcategoryId", value)}
                      disabled={!formData.categoryId || availableSubcategories.length === 0}
                    >
                      <SelectTrigger className={formData.categoryId && !formData.subcategoryId ? "border-red-300" : ""}>
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.categoryId && availableSubcategories.length === 0 && (
                      <p className="text-sm text-amber-600">No subcategories available for this category</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Micro Category {availableMicroCategories.length > 0 ? "*" : ""}</Label>
                  <Select
                    value={formData.microCategoryId}
                    onValueChange={(value) => handleInputChange("microCategoryId", value)}
                    disabled={!formData.subcategoryId || availableMicroCategories.length === 0}
                  >
                    <SelectTrigger
                      className={
                        availableMicroCategories.length > 0 && !formData.microCategoryId ? "border-red-300" : ""
                      }
                    >
                      <SelectValue
                        placeholder={
                          availableMicroCategories.length > 0
                            ? "Select a micro category"
                            : "Select a micro category (optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMicroCategories.map((microCategory) => (
                        <SelectItem key={microCategory.id} value={microCategory.id}>
                          {microCategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.subcategoryId && availableMicroCategories.length === 0 && (
                    <p className="text-sm text-gray-500">No micro categories defined for this subcategory</p>
                  )}
                  {availableMicroCategories.length > 0 && (
                    <p className="text-sm text-orange-600">Micro category selection is required for this subcategory</p>
                  )}
                  {!formData.subcategoryId && <p className="text-sm text-gray-500">Select a subcategory first</p>}
                </div>

                {!isStepValid(1) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Please complete the following to continue:</p>
                      <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                        {formData.title.length < 10 && <li>Service title must be at least 10 characters</li>}
                        {formData.description.length < 50 && (
                          <li>Service description must be at least 50 characters</li>
                        )}
                        {!formData.categoryId && <li>Please select a category</li>}
                        {!formData.subcategoryId && <li>Please select a subcategory</li>}
                        {availableMicroCategories.length > 0 && !formData.microCategoryId && (
                          <li>Please select a micro category</li>
                        )}
                      </ul>
                    </div>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 2: Service Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Service Details</h2>

                {/* Service Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Images *</label>
                  <p className="text-sm text-gray-500 mb-3">
                    Upload at least 1 image to showcase your service (max 5 images)
                  </p>
                  <FileUpload
                    onFilesChange={handleFilesChange}
                    maxFiles={5}
                    maxSize={5}
                    acceptedTypes={["image/*"]}
                    showPreview={true}
                  />
                </div>

                {/* Video Thumbnail */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Video Thumbnail (Optional)</label>
                  <p className="text-sm text-gray-500 mb-3">Add a video to showcase your service</p>

                  <div className="grid md:grid-cols-3 gap-3">
                    <select
                      value={formData.videoThumbnailType}
                      onChange={(e) => setFormData({ ...formData, videoThumbnailType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Video type</option>
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="direct">Direct Link</option>
                    </select>

                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={formData.videoThumbnailUrl}
                        onChange={(e) => setFormData({ ...formData, videoThumbnailUrl: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          !formData.videoThumbnailType ? "border-gray-300" : "border-gray-300"
                        }`}
                        placeholder={
                          formData.videoThumbnailType === "youtube"
                            ? "https://www.youtube.com/watch?v=..."
                            : formData.videoThumbnailType === "vimeo"
                              ? "https://vimeo.com/..."
                              : formData.videoThumbnailType === "direct"
                                ? "https://example.com/video.mp4"
                                : "Select video type first"
                        }
                        disabled={!formData.videoThumbnailType}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Simplified Pricing */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Set Your Pricing</h2>
                  <p className="text-gray-600 mt-2">Create pricing packages for your service</p>
                </div>

                {/* Quick Start Templates */}
                {formData.serviceTiers.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-4">Quick Start Templates</h3>
                    <p className="text-blue-700 mb-4">
                      Choose a template to get started quickly, then customize as needed:
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      <button
                        type="button"
                        onClick={() => addServiceTier("starter")}
                        className="p-4 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 text-left"
                      >
                        <div className="font-medium text-blue-900">Single Package</div>
                        <div className="text-sm text-blue-700 mt-1">One simple pricing option</div>
                        <div className="text-lg font-bold text-green-600 mt-2">$25</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addServiceTier("starter")
                          setTimeout(() => addServiceTier("standard"), 100)
                        }}
                        className="p-4 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 text-left"
                      >
                        <div className="font-medium text-blue-900">Two Packages</div>
                        <div className="text-sm text-blue-700 mt-1">Basic + Standard options</div>
                        <div className="text-lg font-bold text-green-600 mt-2">$25 - $50</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addServiceTier("starter")
                          setTimeout(() => addServiceTier("standard"), 100)
                          setTimeout(() => addServiceTier("advanced"), 200)
                        }}
                        className="p-4 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 text-left"
                      >
                        <div className="font-medium text-blue-900">Three Packages</div>
                        <div className="text-sm text-blue-700 mt-1">Basic + Standard + Premium</div>
                        <div className="text-lg font-bold text-green-600 mt-2">$25 - $100</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Service Tiers */}
                {formData.serviceTiers.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Your Service Packages</h3>
                      {formData.serviceTiers.length < 3 && (
                        <Button type="button" onClick={() => addServiceTier()} variant="outline" size="sm">
                          Add Package
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-6">
                      {formData.serviceTiers.map((tier, index) => (
                        <div key={tier.id} className="bg-white border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-medium text-gray-900">Package {index + 1}</h4>
                            {formData.serviceTiers.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeServiceTier(tier.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            )}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Package Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Package Name *</label>
                              <input
                                type="text"
                                value={tier.name}
                                onChange={(e) => updateServiceTier(tier.id, { name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Basic, Standard, Premium"
                              />
                            </div>

                            {/* Price */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Price (USD) *</label>
                              <input
                                type="number"
                                min="5"
                                max="10000"
                                value={tier.price}
                                onChange={(e) =>
                                  updateServiceTier(tier.id, { price: Number.parseInt(e.target.value) || 0 })
                                }
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="25"
                              />
                            </div>

                            {/* Delivery Time */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time *</label>
                              <div className="flex space-x-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={tier.deliveryTimeValue}
                                  onChange={(e) =>
                                    updateServiceTier(tier.id, {
                                      deliveryTimeValue: Number.parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="w-20 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                  value={tier.deliveryTimeUnit}
                                  onChange={(e) =>
                                    updateServiceTier(tier.id, { deliveryTimeUnit: e.target.value as any })
                                  }
                                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                </select>
                              </div>
                            </div>

                            {/* Revisions */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Revisions Included *
                              </label>
                              <div className="flex items-center space-x-4">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={tier.revisionsIncluded}
                                  onChange={(e) =>
                                    updateServiceTier(tier.id, {
                                      revisionsIncluded: Number.parseInt(e.target.value) || 0,
                                    })
                                  }
                                  disabled={tier.isUnlimitedRevisions}
                                  className="w-20 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={tier.isUnlimitedRevisions}
                                    onChange={(e) =>
                                      updateServiceTier(tier.id, { isUnlimitedRevisions: e.target.checked })
                                    }
                                    className="mr-2"
                                  />
                                  <span className="text-sm text-gray-700">Unlimited</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Package Description *
                            </label>
                            <textarea
                              value={tier.description}
                              onChange={(e) => updateServiceTier(tier.id, { description: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                              placeholder="Describe what's included in this package..."
                            />
                          </div>

                          {/* Features */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">What's Included</label>
                            <div className="space-y-2">
                              {tier.features.map((feature, featureIndex) => (
                                <div key={featureIndex} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={feature}
                                    onChange={(e) => updateTierFeature(tier.id, featureIndex, e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Logo design, Source files, Commercial license"
                                  />
                                  <Button
                                    type="button"
                                    onClick={() => removeTierFeature(tier.id, featureIndex)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              {tier.features.length < 10 && (
                                <Button
                                  type="button"
                                  onClick={() => addTierFeature(tier.id)}
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                >
                                  Add Feature
                                </Button>
                              )}
                              {tier.features.length === 0 && (
                                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-md">
                                  No features added yet. Click "Add Feature" to include what's delivered with this
                                  package.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation Errors */}
                {formData.serviceTiers.length > 0 && validateServiceTiers().length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Please fix the following issues:</p>
                      <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                        {validateServiceTiers().map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 4: Requirements & Tags */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Requirements & Tags</h2>

                {/* Buyer Requirements */}
                <div>
                  <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Requirements *
                  </label>
                  <textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                    placeholder="What information do you need from buyers to complete their order? (e.g., business name, color preferences, content, etc.)"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Be specific about what buyers need to provide to avoid delays
                  </p>
                </div>

                {/* Search Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Tags *</label>
                  <p className="text-sm text-gray-500 mb-3">Add tags to help buyers find your service (max 10 tags)</p>

                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          if (newTag.trim() !== "" && formData.tags.length < 10) {
                            setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] })
                            setNewTag("")
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a tag..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTag.trim() !== "" && formData.tags.length < 10) {
                          setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] })
                          setNewTag("")
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Add
                    </button>
                  </div>

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.tags.map((tag, index) => (
                        <div
                          key={index}
                          className="px-3 py-1 bg-gray-200 rounded-full text-sm text-gray-700 flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = [...formData.tags]
                              newTags.splice(index, 1)
                              setFormData({ ...formData, tags: newTags })
                            }}
                            className="hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between space-x-3">
              {currentStep > 1 && (
                <Button type="button" onClick={prevStep} variant="outline">
                  Previous
                </Button>
              )}
              <div className="flex-1" />
              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep} disabled={!isStepValid(currentStep)}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" disabled={serviceLoading}>
                  {serviceLoading ? "Creating Service..." : "Create Service"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
