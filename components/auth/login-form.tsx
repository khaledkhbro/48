"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Mail, Lock } from "lucide-react"
import { FaGoogle, FaFacebook, FaTwitter } from "react-icons/fa"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const { signIn, signInWithOAuth, isLoading } = useAuth()
  const router = useRouter()

  const handleSocialAuth = async (provider: "google" | "facebook" | "twitter") => {
    setSocialLoading(provider)
    setError("")

    try {
      console.log(`[v0] Initiating ${provider} authentication...`)
      await signInWithOAuth(provider)
      // OAuth flow will redirect to provider, so no need to handle success here
    } catch (err) {
      console.error(`[v0] OAuth error for ${provider}:`, err)
      setError(err instanceof Error ? err.message : `Failed to authenticate with ${provider}`)
      setSocialLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    try {
      await signIn(email, password)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password")
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setError("")
    alert("Password reset functionality is not yet implemented. Please contact support.")
    setShowForgotPassword(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6 pt-6">
        <CardTitle className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Welcome back
        </CardTitle>
        <CardDescription className="text-center text-slate-600 text-sm sm:text-base">
          Sign in to your WorkHub account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
        <div className="space-y-2 sm:space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full bg-white/50 hover:bg-white/80 border-slate-200 hover:border-slate-300 transition-all duration-200 h-11 sm:h-12"
            onClick={() => handleSocialAuth("google")}
            disabled={isLoading || socialLoading !== null}
          >
            {socialLoading === "google" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FaGoogle className="mr-2 h-4 w-4 text-red-500" />
            )}
            <span className="text-sm sm:text-base">Continue with Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-white/50 hover:bg-white/80 border-slate-200 hover:border-slate-300 transition-all duration-200 h-11 sm:h-12"
            onClick={() => handleSocialAuth("facebook")}
            disabled={isLoading || socialLoading !== null}
          >
            {socialLoading === "facebook" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FaFacebook className="mr-2 h-4 w-4 text-blue-600" />
            )}
            <span className="text-sm sm:text-base">Continue with Facebook</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-white/50 hover:bg-white/80 border-slate-200 hover:border-slate-300 transition-all duration-200 h-11 sm:h-12"
            onClick={() => handleSocialAuth("twitter")}
            disabled={isLoading || socialLoading !== null}
          >
            {socialLoading === "twitter" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FaTwitter className="mr-2 h-4 w-4 text-blue-400" />
            )}
            <span className="text-sm sm:text-base">Continue with Twitter</span>
          </Button>
        </div>

        <div className="relative my-4 sm:my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-500 font-medium">Or continue with email</span>
          </div>
        </div>

        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900">Reset Password</h3>
              <p className="text-sm text-slate-600 mt-1">Enter your email to receive a reset link</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 sm:h-12 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 h-11 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Reset Link
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 sm:h-12 bg-white/50 border-slate-200"
                onClick={() => setShowForgotPassword(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 sm:h-12 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 sm:h-12 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        )}

        <div className="text-center text-sm">
          <span className="text-slate-600">Don't have an account? </span>
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
          >
            Sign up
          </Link>
        </div>

        <div className="text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
          <p className="bg-slate-50 rounded-lg px-3 py-2 inline-block">
            <span className="font-medium">Demo:</span> admin@marketplace.com / admin123
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
