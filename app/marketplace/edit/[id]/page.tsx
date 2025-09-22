"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { serviceStorage, type StorageService } from "@/lib/local-storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, Plus, X, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function EditServicePage() {
  const [service, setService] = useState<StorageService | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    price: 0,
    deliveryTime: {
      value: 1,
      unit: "days" as "instant" | "minutes" | "hours" | "days",
    },
    revisionsIncluded: 1,
    category: "",
    subcategory: "",
    microCategory: "",
    images: [] as string[],
    videoUrl: "",
    requirements: "",
    tags: [] as string[],
    serviceTiers: [] as {
      id: string
      name: string
      price: number
      deliveryTime: number
      revisions: number | "unlimited"
      features: string[]
      description?: string
    }[],
  })

  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const loadService = () => {
      try {
        const foundService = serviceStorage.getById(serviceId)

        if (!foundService) {
          console.log("[v0] Service not found:", serviceId)
          router.push("/dashboard/services")
          return
        }

        // Check if user owns this service
        if (foundService.sellerId !== user?.id) {
          console.log("[v0] User doesn't own this service")
          router.push("/dashboard/services")
          return
        }

        setService(foundService)
        setFormData({
          title: foundService.title,
          shortDescription: foundService.shortDescription,
          description: foundService.description,
          price: foundService.price,
          deliveryTime: foundService.deliveryTime,
          revisionsIncluded: foundService.revisionsIncluded,
          category: foundService.category || "",
          subcategory: foundService.subcategory || "",
          microCategory: foundService.microCategory || "",
          images: foundService.images || [],
          videoUrl: foundService.videoUrl || "",
          requirements: foundService.requirements || "",
          tags: foundService.tags || [],
          serviceTiers: foundService.serviceTiers || [],
        })
      } catch (error) {
        console.error("[v0] Error loading service:", error)
        router.push("/dashboard/services")
      } finally {
        setLoading(false)
      }
    }

    if (user?.id && isAuthenticated) {
      loadService()
    }
  }, [serviceId, user?.id, router, isAuthenticated])

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addPricingTier = () => {
    const newTier = {
      id: Date.now().toString(),
      name: `Package ${formData.serviceTiers.length + 1}`,
      price: 50,
      deliveryTime: 3,
      revisions: 1,
      features: [],
      description: "",
    }
    setFormData({
      ...formData,
      serviceTiers: [...formData.serviceTiers, newTier],
    })
  }

  const removePricingTier = (tierId: string) => {
    setFormData({
      ...formData,
      serviceTiers: formData.serviceTiers.filter((tier) => tier.id !== tierId),
    })
  }

  const updatePricingTier = (tierId: string, updates: Partial<(typeof formData.serviceTiers)[0]>) => {
    setFormData({
      ...formData,
      serviceTiers: formData.serviceTiers.map((tier) => (tier.id === tierId ? { ...tier, ...updates } : tier)),
    })
  }

  const addFeatureToTier = (tierId: string, feature: string) => {
    if (!feature.trim()) return
    updatePricingTier(tierId, {
      features: [...(formData.serviceTiers.find((t) => t.id === tierId)?.features || []), feature],
    })
  }

  const removeFeatureFromTier = (tierId: string, featureIndex: number) => {
    const tier = formData.serviceTiers.find((t) => t.id === tierId)
    if (!tier) return
    updatePricingTier(tierId, {
      features: tier.features.filter((_, index) => index !== featureIndex),
    })
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag.trim()],
      })
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  const handleSave = async () => {
    if (!service || !user?.id) return

    setSaving(true)
    try {
      const updatedService: StorageService = {
        ...service,
        title: formData.title,
        shortDescription: formData.shortDescription,
        description: formData.description,
        price: formData.price,
        deliveryTime: formData.deliveryTime,
        revisionsIncluded: formData.revisionsIncluded,
        category: formData.category,
        subcategory: formData.subcategory,
        microCategory: formData.microCategory,
        images: formData.images,
        videoUrl: formData.videoUrl,
        requirements: formData.requirements,
        tags: formData.tags,
        serviceTiers: formData.serviceTiers,
        updatedAt: new Date().toISOString(),
      }

      serviceStorage.update(serviceId, updatedService)
      console.log("[v0] Service updated successfully")

      // Redirect back to services page
      router.push("/dashboard/services")
    } catch (error) {
      console.error("[v0] Error updating service:", error)
      alert("Failed to update service. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/dashboard/services">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Service</h1>
          <p className="text-gray-600">Update your service details and pricing</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
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

        <Card>
          <CardContent className="p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>

                <div>
                  <Label htmlFor="title">Service Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter service title"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="graphics-design">Graphics & Design</SelectItem>
                        <SelectItem value="digital-marketing">Digital Marketing</SelectItem>
                        <SelectItem value="writing-translation">Writing & Translation</SelectItem>
                        <SelectItem value="video-animation">Video & Animation</SelectItem>
                        <SelectItem value="music-audio">Music & Audio</SelectItem>
                        <SelectItem value="programming-tech">Programming & Tech</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subcategory">Subcategory *</Label>
                    <Select
                      value={formData.subcategory}
                      onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="logo-design">Logo Design</SelectItem>
                        <SelectItem value="web-design">Web Design</SelectItem>
                        <SelectItem value="app-design">App Design</SelectItem>
                        <SelectItem value="social-media-design">Social Media Design</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="microCategory">Micro Category</Label>
                  <Input
                    id="microCategory"
                    value={formData.microCategory}
                    onChange={(e) => setFormData({ ...formData, microCategory: e.target.value })}
                    placeholder="Optional: More specific category"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Service Details</h2>

                <div>
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of your service"
                    className="mt-1"
                    rows={6}
                  />
                </div>

                <div>
                  <Label>Service Images</Label>
                  <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-gray-500">Upload images to showcase your service</p>
                    <Button variant="outline" className="mt-2 bg-transparent">
                      Choose Files
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="videoUrl">Video URL (Optional)</Label>
                  <Input
                    id="videoUrl"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="YouTube or Vimeo URL"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Set Your Pricing</h2>
                  <p className="text-gray-600 mt-2">Create pricing packages for your service</p>
                </div>

                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Your Service Packages</h3>
                  <Button onClick={addPricingTier} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Package
                  </Button>
                </div>

                {formData.serviceTiers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No pricing packages yet. Add packages to offer different service tiers.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {formData.serviceTiers.map((tier, index) => (
                      <div key={tier.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Package {index + 1}</h4>
                          <Button
                            onClick={() => removePricingTier(tier.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Package Name *</Label>
                            <Input
                              value={tier.name}
                              onChange={(e) => updatePricingTier(tier.id, { name: e.target.value })}
                              placeholder="e.g., Basic, Standard, Premium"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Price (USD) *</Label>
                            <Input
                              type="number"
                              value={tier.price}
                              onChange={(e) => updatePricingTier(tier.id, { price: Number(e.target.value) })}
                              min="1"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Delivery Time *</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                type="number"
                                value={tier.deliveryTime}
                                onChange={(e) => updatePricingTier(tier.id, { deliveryTime: Number(e.target.value) })}
                                min="1"
                                className="flex-1"
                              />
                              <Select defaultValue="Days">
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Days">Days</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label>Revisions Included *</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                value={tier.revisions === "unlimited" ? "" : tier.revisions}
                                onChange={(e) =>
                                  updatePricingTier(tier.id, {
                                    revisions: e.target.value === "" ? "unlimited" : Number(e.target.value),
                                  })
                                }
                                placeholder="2"
                                min="0"
                                className="flex-1"
                              />
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`unlimited-${tier.id}`}
                                  checked={tier.revisions === "unlimited"}
                                  onCheckedChange={(checked) =>
                                    updatePricingTier(tier.id, { revisions: checked ? "unlimited" : 1 })
                                  }
                                />
                                <Label htmlFor={`unlimited-${tier.id}`} className="text-sm">
                                  Unlimited
                                </Label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Package Description *</Label>
                          <Textarea
                            value={tier.description || ""}
                            onChange={(e) => updatePricingTier(tier.id, { description: e.target.value })}
                            placeholder="Describe what's included in this package"
                            className="mt-1"
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label>What's Included (Optional)</Label>
                          <div className="space-y-2 mt-1">
                            {tier.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center gap-2">
                                <Input
                                  value={feature}
                                  onChange={(e) => {
                                    const newFeatures = [...tier.features]
                                    newFeatures[featureIndex] = e.target.value
                                    updatePricingTier(tier.id, { features: newFeatures })
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  onClick={() => removeFeatureFromTier(tier.id, featureIndex)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              onClick={() => addFeatureToTier(tier.id, "New feature")}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              Add Feature
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Requirements & Tags</h2>

                <div>
                  <Label htmlFor="requirements">Buyer Requirements *</Label>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="What information do you need from buyers to get started?"
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Search Tags</Label>
                  <div className="mt-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button onClick={() => removeTag(tag)} className="ml-2 text-blue-600 hover:text-blue-800">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <Input
                      placeholder="Add tags (press Enter to add)"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTag(e.currentTarget.value)
                          e.currentTarget.value = ""
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button onClick={prevStep} variant="outline" disabled={currentStep === 1}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="flex space-x-4">
                <Link href="/dashboard/services">
                  <Button variant="outline">Cancel</Button>
                </Link>

                {currentStep === 4 ? (
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={nextStep}>
                    Next Step
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
