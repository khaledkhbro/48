"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Clock, Database, Zap } from "lucide-react"

interface SetupStep {
  name: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
}

export default function DatabaseSetupPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [steps, setSteps] = useState<SetupStep[]>([])
  const [logs, setLogs] = useState<string[]>([])

  const runCompleteSetup = async () => {
    setIsRunning(true)
    setProgress(0)
    setSteps([])
    setLogs(["🚀 Starting complete database setup..."])

    try {
      const response = await fetch("/api/admin/database-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_all_scripts" }),
      })

      if (!response.ok) {
        throw new Error("Setup failed")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response stream")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)

            if (data.type === "progress") {
              setProgress(data.progress)
            } else if (data.type === "step") {
              setSteps((prev) => {
                const existing = prev.find((s) => s.name === data.step.name)
                if (existing) {
                  return prev.map((s) => (s.name === data.step.name ? data.step : s))
                }
                return [...prev, data.step]
              })
            } else if (data.type === "log") {
              setLogs((prev) => [...prev, data.message])
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }

      setLogs((prev) => [...prev, "🎉 Database setup completed successfully!"])
    } catch (error) {
      setLogs((prev) => [...prev, `❌ Setup failed: ${error}`])
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: SetupStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Setup</h1>
        <p className="text-muted-foreground">One-click setup for your complete microjob marketplace database</p>
      </div>

      <div className="grid gap-6">
        {/* Setup Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Complete Database Setup
            </CardTitle>
            <CardDescription>
              Run all SQL scripts to set up your complete microjob marketplace database. This includes all tables,
              indexes, functions, and sample data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={runCompleteSetup} disabled={isRunning} size="lg" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                {isRunning ? "Setting up database..." : "Run Complete Setup"}
              </Button>

              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup Steps */}
        {steps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Progress</CardTitle>
              <CardDescription>Current status of database setup steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    {getStatusIcon(step.status)}
                    <span className="flex-1 text-sm">{step.name}</span>
                    {step.error && <span className="text-xs text-red-500">{step.error}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Logs</CardTitle>
              <CardDescription>Detailed logs from the setup process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
