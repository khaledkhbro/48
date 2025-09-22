"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings, UserCheck, Users, AlertTriangle, CheckCircle, Info, Shield, ShieldOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AdminSetting {
  id: string
  setting_key: string
  setting_value: string
  setting_type: string
  description: string
  updated_at: string
}

export default function ServiceProviderSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    approvedProviders: 0,
    totalServices: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
    fetchStats()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings/service-provider")
      const data = await response.json()

      if (data.setting) {
        setRequireApproval(data.setting.setting_value === "true")
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/settings/service-provider/stats")
      const data = await response.json()
      setStats(data.stats || stats)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleToggleChange = async (enabled: boolean) => {
    setSaving(true)

    try {
      const response = await fetch("/api/admin/settings/service-provider", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          require_approval: enabled,
        }),
      })

      if (response.ok) {
        setRequireApproval(enabled)
        toast({
          title: "Settings Updated",
          description: enabled
            ? "Service provider approval is now required"
            : "Anyone can now create services without approval",
        })
      } else {
        throw new Error("Failed to update settings")
      }
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Provider Settings</h1>
          <p className="text-gray-600">Configure how users can become service providers</p>
        </div>
        <Badge variant={requireApproval ? "default" : "secondary"} className="flex items-center gap-2">
          {requireApproval ? <Shield className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
          {requireApproval ? "Approval Required" : "Open Access"}
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalApplications}</div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.pendingApplications}</div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approvedProviders}</div>
            <div className="text-sm text-gray-600">Approved Providers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalServices}</div>
            <div className="text-sm text-gray-600">Active Services</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Service Provider Approval Requirement
          </CardTitle>
          <CardDescription>
            Control whether users need admin approval before they can create and sell services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="approval-toggle" className="text-base font-medium">
                Require Service Provider Approval
              </Label>
              <p className="text-sm text-gray-600">
                When enabled, users must apply and get approved before creating services
              </p>
            </div>
            <Switch
              id="approval-toggle"
              checked={requireApproval}
              onCheckedChange={handleToggleChange}
              disabled={saving}
            />
          </div>

          {/* Current Status Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Current Status:</strong>{" "}
              {requireApproval
                ? "Users must apply and get approved before they can create services. This helps maintain quality control."
                : "Anyone can create services immediately without approval. This allows faster onboarding but less quality control."}
            </AlertDescription>
          </Alert>

          {/* Impact Warning */}
          {!requireApproval && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> With approval disabled, any registered user can create services immediately.
                Make sure you have other quality control measures in place.
              </AlertDescription>
            </Alert>
          )}

          {/* Feature Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className={requireApproval ? "border-green-200 bg-green-50" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Approval Required
                  {requireApproval && (
                    <Badge variant="default" className="bg-green-600">
                      Active
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Quality control through review process
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Verified service providers only
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Reduced spam and low-quality services
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Slower onboarding process
                </div>
              </CardContent>
            </Card>

            <Card className={!requireApproval ? "border-blue-200 bg-blue-50" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Open Access
                  {!requireApproval && (
                    <Badge variant="default" className="bg-blue-600">
                      Active
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Instant service creation
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Faster marketplace growth
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Lower barrier to entry
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Potential quality control issues
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => (window.location.href = "/admin/service-provider-applications")}>
              <UserCheck className="h-4 w-4 mr-2" />
              Manage Applications
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/admin/services")}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Services
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
