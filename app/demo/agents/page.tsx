import { AgentLoginHelper } from "@/components/demo/agent-login-helper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Users, Shield, Zap } from "lucide-react"

export default function AgentDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Agent Demo Access</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Test the complete agent support system with pre-configured demo accounts and live customer chat sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demo Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Ready for testing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Live demo chats</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Features</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">Fully functional</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Demo</div>
              <p className="text-xs text-muted-foreground">Safe environment</p>
            </CardContent>
          </Card>
        </div>

        <AgentLoginHelper />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>What You Can Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Agent Features</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time customer chat interface</li>
                  <li>• Session management and assignment</li>
                  <li>• Performance analytics dashboard</li>
                  <li>• Status management (Available/Busy/Offline)</li>
                  <li>• Message history and context</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Demo Data</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 3 active chat sessions with customers</li>
                  <li>• Historical performance metrics</li>
                  <li>• Sample customer inquiries</li>
                  <li>• Response time tracking</li>
                  <li>• Customer satisfaction scores</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
