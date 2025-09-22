"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, CheckCircle, MessageSquare, Users, Clock } from "lucide-react"

export function AgentLoginHelper() {
  const [copiedCredential, setCopiedCredential] = useState<string | null>(null)

  const demoAgents = [
    {
      id: "agent1",
      email: "agent1@marketplace.com",
      password: "agent123",
      name: "Sarah Johnson",
      status: "available",
      activeSessions: 1,
      todayMessages: 47,
      avgResponse: "2.3 min",
    },
    {
      id: "agent2",
      email: "agent2@marketplace.com",
      password: "agent123",
      name: "Mike Chen",
      status: "busy",
      activeSessions: 1,
      todayMessages: 32,
      avgResponse: "2.8 min",
    },
    {
      id: "agent3",
      email: "agent3@marketplace.com",
      password: "agent123",
      name: "Emma Rodriguez",
      status: "available",
      activeSessions: 0,
      todayMessages: 28,
      avgResponse: "2.4 min",
    },
  ]

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCredential(`${type}`)
    setTimeout(() => setCopiedCredential(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500"
      case "busy":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Demo Agent Login Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {demoAgents.map((agent) => (
              <div key={agent.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></div>
                    <div>
                      <h3 className="font-medium">{agent.name}</h3>
                      <p className="text-sm text-gray-600">{agent.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {agent.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1 text-gray-400" />
                    <span>{agent.activeSessions} active</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1 text-gray-400" />
                    <span>{agent.todayMessages} today</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-gray-400" />
                    <span>{agent.avgResponse} avg</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(agent.email, `${agent.id}-email`)}
                    className="flex-1"
                  >
                    {copiedCredential === `${agent.id}-email` ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(agent.password, `${agent.id}-password`)}
                    className="flex-1"
                  >
                    {copiedCredential === `${agent.id}-password` ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy Password
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Quick Access</h4>
            <p className="text-sm text-blue-800 mb-3">
              All demo agents use the same password: <code className="bg-blue-100 px-1 rounded">agent123</code>
            </p>
            <div className="flex space-x-2">
              <Button size="sm" asChild>
                <a href="/agent/login" target="_blank" rel="noreferrer">
                  Open Agent Login
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/admin" target="_blank" rel="noreferrer">
                  Open Admin Panel
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
