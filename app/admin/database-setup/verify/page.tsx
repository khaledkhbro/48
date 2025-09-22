"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function DatabaseVerificationPage() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  const verifyDatabase = async () => {
    setIsVerifying(true)
    setResults([])
    setSummary(null)

    try {
      const response = await fetch("/api/admin/database-verify", {
        method: "POST",
      })

      const data = await response.json()
      setResults(data.results || [])
      setSummary(data.summary || {})
    } catch (error) {
      console.error("Verification failed:", error)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Setup Verification</h1>
        <p className="text-muted-foreground">Verify that all database tables and functions are properly set up</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>Click the button below to check if your database setup is complete</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={verifyDatabase} disabled={isVerifying} className="w-full">
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying Database...
              </>
            ) : (
              "Verify Database Setup"
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Table Verification Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2">
                  {result.status === "success" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{result.table}</span>
                  <span className="text-sm text-muted-foreground">{result.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Database Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalTables || 0}</div>
                <div className="text-sm text-muted-foreground">Total Tables</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.successfulTables || 0}</div>
                <div className="text-sm text-muted-foreground">Working Tables</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.totalJobs || 0}</div>
                <div className="text-sm text-muted-foreground">Sample Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.totalCategories || 0}</div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </div>
            </div>

            {summary.allTablesWorking && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Database Setup Complete!</span>
                </div>
                <p className="text-sm text-green-700 mt-1">Your microjob marketplace database is ready to use.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
