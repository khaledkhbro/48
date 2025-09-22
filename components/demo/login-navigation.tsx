"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Shield, Settings } from "lucide-react"
import Link from "next/link"

export function LoginNavigation() {
  const loginPages = [
    {
      title: "Agent Login",
      description: "Login as a support agent to handle customer chats",
      url: "/agent/login",
      icon: User,
      credentials: [
        { email: "agent1@marketplace.com", password: "agent123" },
        { email: "agent2@marketplace.com", password: "agent123" },
        { email: "agent3@marketplace.com", password: "agent123" },
      ],
    },
    {
      title: "Admin Login",
      description: "Login as admin to manage the platform",
      url: "/admin/login",
      icon: Shield,
      credentials: [{ email: "admin@marketplace.com", password: "admin123" }],
    },
    {
      title: "User Login",
      description: "Login as a regular user",
      url: "/login",
      icon: Settings,
      credentials: [{ email: "user@example.com", password: "password123" }],
    },
  ]

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Demo Login Access</h1>
        <p className="text-muted-foreground">Choose your login type and use the demo credentials below</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loginPages.map((page) => {
          const Icon = page.icon
          return (
            <Card key={page.url} className="relative">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle>{page.title}</CardTitle>
                </div>
                <CardDescription>{page.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href={page.url}>
                  <Button className="w-full">Go to {page.title}</Button>
                </Link>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Demo Credentials:</p>
                  {page.credentials.map((cred, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-xs space-y-1">
                      <div>
                        <strong>Email:</strong> {cred.email}
                      </div>
                      <div>
                        <strong>Password:</strong> {cred.password}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Quick Access URLs:</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <strong>Agent Login:</strong> <code>/agent/login</code>
          </li>
          <li>
            <strong>Admin Login:</strong> <code>/admin/login</code>
          </li>
          <li>
            <strong>User Login:</strong> <code>/login</code>
          </li>
          <li>
            <strong>Agent Dashboard:</strong> <code>/agent</code> (after login)
          </li>
          <li>
            <strong>Admin Dashboard:</strong> <code>/admin</code> (after login)
          </li>
        </ul>
      </div>
    </div>
  )
}
