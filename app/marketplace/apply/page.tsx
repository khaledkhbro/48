"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, X, ExternalLink, CheckCircle, Clock, AlertCircle, Upload } from "lucide-react"
import { useRouter } from "next/navigation"

const PLATFORM_OPTIONS = [
  { id: "fiverr", name: "Fiverr", placeholder: "https://fiverr.com/username" },
  { id: "upwork", name: "Upwork", placeholder: "https://upwork.com/freelancers/~username" },
  { id: "peopleperhour", name: "PeoplePerHour", placeholder: "https://peopleperhour.com/freelancer/username" },
  { id: "legiit", name: "Legiit", placeholder: "https://legiit.com/profile/username" },
]

const SKILL_SUGGESTIONS = [
  "Web Development",
  "Mobile App Development",
  "UI/UX Design",
  "Graphic Design",
  "Content Writing",
  "SEO",
  "Social Media Marketing",
  "Video Editing",
  "Data Entry",
  "Virtual Assistant",
  "Translation",
  "Voice Over",
  "Photography",
  "Logo Design",
  "WordPress",
  "E-commerce",
]

export default function ServiceProviderApplication() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    skills: [] as string[],
    experienceYears: "",
    education: "",
    certifications: [] as string[],
    certificationFiles: [] as File[],
    portfolioLinks: [] as string[],
    workSamples: [] as string[],
    platformProfiles: {
      fiverr: "",
      upwork: "",
      peopleperhour: "",
      legiit: "",
    },
  })

  const [newSkill, setNewSkill] = useState("")
  const [newCertification, setNewCertification] = useState("")
  const [newPortfolioLink, setNewPortfolioLink] = useState("")
  const [newWorkSample, setNewWorkSample] = useState("")

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
      }))
      setNewSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  const addCertification = () => {
    if (newCertification && !formData.certifications.includes(newCertification)) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification],
      }))
      setNewCertification("")
    }
  }

  const removeCertification = (cert: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== cert),
    }))
  }

  const addPortfolioLink = () => {
    if (newPortfolioLink && !formData.portfolioLinks.includes(newPortfolioLink)) {
      setFormData((prev) => ({
        ...prev,
        portfolioLinks: [...prev.portfolioLinks, newPortfolioLink],
      }))
      setNewPortfolioLink("")
    }
  }

  const removePortfolioLink = (link: string) => {
    setFormData((prev) => ({
      ...prev,
      portfolioLinks: prev.portfolioLinks.filter((l) => l !== link),
    }))
  }

  const addWorkSample = () => {
    if (newWorkSample && !formData.workSamples.includes(newWorkSample)) {
      setFormData((prev) => ({
        ...prev,
        workSamples: [...prev.workSamples, newWorkSample],
      }))
      setNewWorkSample("")
    }
  }

  const removeWorkSample = (sample: string) => {
    setFormData((prev) => ({
      ...prev,
      workSamples: prev.workSamples.filter((s) => s !== sample),
    }))
  }

  const handleCertificationFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData((prev) => ({
      ...prev,
      certificationFiles: [...prev.certificationFiles, ...files],
    }))
  }

  const removeCertificationFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certificationFiles: prev.certificationFiles.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/service-provider-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push("/marketplace/apply/success")
      } else {
        throw new Error("Failed to submit application")
      }
    } catch (error) {
      console.error("Error submitting application:", error)
      alert("Failed to submit application. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Seller</h1>
          <p className="text-gray-600">
            Apply to become a verified seller on our marketplace. Our admin team will review your application and get
            back to you within 2-3 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Basic Information
              </CardTitle>
              <CardDescription>Please enter your contact information manually.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills and Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Skills & Experience
              </CardTitle>
              <CardDescription>Share your skills and professional experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Skills *</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))}
                  />
                  <Button type="button" onClick={() => addSkill(newSkill)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SKILL_SUGGESTIONS.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => addSkill(skill)}
                    >
                      + {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experienceYears">Years of Experience *</Label>
                  <Input
                    id="experienceYears"
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData((prev) => ({ ...prev, experienceYears: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    placeholder="e.g., Bachelor's in Computer Science"
                    value={formData.education}
                    onChange={(e) => setFormData((prev) => ({ ...prev, education: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Certifications</Label>
                <p className="text-sm text-gray-600 mb-2">Add certification names and upload certificate files</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.certifications.map((cert) => (
                    <Badge key={cert} variant="secondary" className="flex items-center gap-1">
                      {cert}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeCertification(cert)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add a certification name..."
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCertification())}
                  />
                  <Button type="button" onClick={addCertification}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <Label htmlFor="certification-files" className="cursor-pointer">
                      <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                        Upload certification files
                      </span>
                      <Input
                        id="certification-files"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleCertificationFileUpload}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC, DOCX up to 10MB each</p>
                  </div>
                  {formData.certificationFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.certificationFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCertificationFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio and Work Samples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-purple-600" />
                Portfolio & Work Samples
              </CardTitle>
              <CardDescription>Show us your best work with links to your portfolio and work samples.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Portfolio Links</Label>
                <div className="space-y-2 mb-2">
                  {formData.portfolioLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                      <span className="flex-1 text-sm">{link}</span>
                      <X className="h-4 w-4 cursor-pointer text-red-500" onClick={() => removePortfolioLink(link)} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://your-portfolio.com"
                    value={newPortfolioLink}
                    onChange={(e) => setNewPortfolioLink(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPortfolioLink())}
                  />
                  <Button type="button" onClick={addPortfolioLink}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Work Samples</Label>
                <div className="space-y-2 mb-2">
                  {formData.workSamples.map((sample, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                      <span className="flex-1 text-sm">{sample}</span>
                      <X className="h-4 w-4 cursor-pointer text-red-500" onClick={() => removeWorkSample(sample)} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://link-to-your-work.com"
                    value={newWorkSample}
                    onChange={(e) => setNewWorkSample(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addWorkSample())}
                  />
                  <Button type="button" onClick={addWorkSample}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* External Platform Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Platform Verification (Optional)
              </CardTitle>
              <CardDescription>
                Share your profiles from other freelancing platforms for faster verification. This helps us verify your
                experience and credibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PLATFORM_OPTIONS.map((platform) => (
                <div key={platform.id}>
                  <Label htmlFor={platform.id}>{platform.name} Profile</Label>
                  <Input
                    id={platform.id}
                    placeholder={platform.placeholder}
                    value={formData.platformProfiles[platform.id as keyof typeof formData.platformProfiles]}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        platformProfiles: {
                          ...prev.platformProfiles,
                          [platform.id]: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
