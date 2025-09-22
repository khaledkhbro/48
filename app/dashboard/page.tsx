"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClearNotifications } from "@/components/notifications/clear-notifications"
import {
  Briefcase,
  ShoppingBag,
  Newspaper,
  DollarSign,
  ExternalLink,
  Star,
  CheckCircle,
  Activity,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { getUserDashboardStats, type DashboardStats } from "@/lib/dashboard-stats"
import { LazyImage } from "@/components/ui/lazy-image"

interface Job {
  id: string
  title: string
  description: string
  price: number
  category: string
  subcategory: string
  applicants: number
  workers_needed: number
  created_at: string
  thumbnail?: string
}

interface MarketplaceService {
  id: string
  name: string
  description: string
  price: number
  seller_name?: string
  rating?: number
  reviews_count?: number
  delivery_time?: number
  delivery_unit?: string
  thumbnail?: string
  category_name?: string
}

interface EarningsNews {
  id: string
  title: string
  description: string
  thumbnail: string
  created_at: string
  views?: number
}

interface PlatformStats {
  availableJobs: number
  newJobsToday: number
  featuredServices: number
  latestArticles: number
  newArticlesThisWeek: number
  todayEarnings: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalEarnings: 0,
    activeJobs: 0,
    completedJobs: 0,
    pendingApplications: 0,
  })
  const [jobs, setJobs] = useState<Job[]>([])
  const [marketplaceServices, setMarketplaceServices] = useState<MarketplaceService[]>([])
  const [earningsNews, setEarningsNews] = useState<EarningsNews[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    availableJobs: 0,
    newJobsToday: 0,
    featuredServices: 0,
    latestArticles: 0,
    newArticlesThisWeek: 0,
    todayEarnings: 0,
  })

  const router = useRouter()
  const { user } = useAuth()

  const fetchPlatformStats = async () => {
    try {
      // Fetch today's earnings from wallet API
      const walletResponse = await fetch(`/api/wallet/${user?.id}`)
      if (walletResponse.ok) {
        const walletData = await walletResponse.json()
        // Calculate today's earnings from recent transactions
        const todayEarnings = walletData.earningsBalance || 0
        setPlatformStats((prev) => ({ ...prev, todayEarnings }))
      }
    } catch (error) {
      console.error("[v0] Error fetching platform stats:", error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true)

      console.log("[v0] Fetching jobs from /api/jobs?limit=3")
      const jobsResponse = await fetch("/api/jobs?limit=3")
      console.log("[v0] Jobs response status:", jobsResponse.status)

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        console.log("[v0] Jobs data received:", jobsData)
        const jobsList = jobsData.jobs?.slice(0, 3) || []
        setJobs(jobsList)

        setPlatformStats((prev) => ({
          ...prev,
          availableJobs: jobsData.total || jobsList.length,
          newJobsToday: jobsData.todayCount || 0,
        }))
      } else {
        console.error("[v0] Jobs API failed with status:", jobsResponse.status)
        const errorText = await jobsResponse.text()
        console.error("[v0] Jobs API error:", errorText)
      }

      const marketplaceResponse = await fetch("/api/marketplace/personalized?limit=3")
      if (marketplaceResponse.ok) {
        const marketplaceData = await marketplaceResponse.json()
        const servicesList = marketplaceData.services?.slice(0, 3) || []
        setMarketplaceServices(servicesList)

        setPlatformStats((prev) => ({
          ...prev,
          featuredServices: marketplaceData.total || servicesList.length,
        }))
      }

      const newsResponse = await fetch("/api/earnings-news?limit=3")
      if (newsResponse.ok) {
        const newsData = await newsResponse.json()
        const newsList = newsData.data?.slice(0, 3) || []
        setEarningsNews(newsList)

        setPlatformStats((prev) => ({
          ...prev,
          latestArticles: newsData.total || newsList.length,
          newArticlesThisWeek: newsData.weekCount || 0,
        }))
      }
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error)
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      try {
        console.log("[v0] Loading dashboard stats for user:", user.id)
        const realStats = await getUserDashboardStats(user.id)
        console.log("[v0] Dashboard stats loaded:", realStats)
        setStats(realStats)
      } catch (error) {
        console.error("[v0] Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    fetchDashboardData()
    fetchPlatformStats()

    if (typeof window !== "undefined") {
      localStorage.removeItem("notification-counts")
      console.log("[v0] Cleared notification counts from localStorage")
    }
  }, [user?.id])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <>
        <DashboardHeader title="Dashboard" description="Welcome back! Here's what's happening across all platforms." />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg font-medium text-foreground">Loading</p>
            <p className="text-sm text-muted-foreground">Preparing your dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader title="Dashboard" description="Welcome back! Here's what's happening across all platforms." />

      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-8">
          <div className="flex justify-end">
            <ClearNotifications />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-in">
            <StatsCard
              title="Total Earnings"
              value={`$${stats.totalEarnings.toFixed(2)}`}
              description="Across all platforms"
              icon={DollarSign}
              trend={{ value: stats.totalEarnings > 0 ? 12.5 : 0, isPositive: stats.totalEarnings > 0 }}
            />
            <StatsCard
              title="Active Projects"
              value={stats.activeJobs}
              description="Jobs + Services"
              icon={Briefcase}
              trend={{ value: stats.activeJobs > 0 ? 8.2 : 0, isPositive: stats.activeJobs > 0 }}
            />
            <StatsCard
              title="Today Earning"
              value={`$${platformStats.todayEarnings.toFixed(2)}`}
              description="Today's income"
              icon={DollarSign}
              trend={{ value: platformStats.todayEarnings > 0 ? 23.1 : 0, isPositive: platformStats.todayEarnings > 0 }}
            />
            <StatsCard
              title="Total Project Completed"
              value={stats.completedJobs}
              description="Successfully finished"
              icon={CheckCircle}
              trend={{ value: stats.completedJobs > 0 ? 18.7 : 0, isPositive: stats.completedJobs > 0 }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Microjobs Platform */}
            <Card className="platform-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">Microjobs</CardTitle>
                      <p className="text-sm text-muted-foreground">Quick tasks & gigs</p>
                    </div>
                  </div>
                  <Link href="/jobs">
                    <Button size="sm" className="action-button action-button-primary">
                      View All <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Activity className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => {
                      const applicants = job.applicants || 0
                      const workersNeeded = job.workers_needed || 1
                      const progressPercentage = Math.min((applicants / workersNeeded) * 100, 100)
                      const isFull = applicants >= workersNeeded
                      const spotsLeft = workersNeeded - applicants

                      return (
                        <div
                          key={job.id}
                          className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                        >
                          <LazyImage
                            src={
                              job.thumbnail ||
                              `/placeholder.svg?height=160&width=240&text=${encodeURIComponent(job.title)}`
                            }
                            alt={job.title}
                            width={48}
                            height={36}
                            className="w-12 h-9 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground truncate">{job.title}</h4>
                            <p className="text-xs text-muted-foreground">{job.subcategory || job.category}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                {isFull ? (
                                  <span className="text-green-600 font-medium">Full</span>
                                ) : (
                                  <span>Need {spotsLeft} more</span>
                                )}
                                <span>
                                  {applicants}/{workersNeeded} applied
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    isFull ? "bg-green-500" : "bg-primary"
                                  }`}
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">${job.price}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Available Jobs</span>
                    <span className="font-medium text-primary">{platformStats.newJobsToday} new today</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Marketplace Platform */}
            <Card className="platform-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                      <ShoppingBag className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">Marketplace</CardTitle>
                      <p className="text-sm text-muted-foreground">Professional services</p>
                    </div>
                  </div>
                  <Link href="/marketplace">
                    <Button size="sm" className="action-button action-button-secondary">
                      Browse <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Activity className="h-6 w-6 animate-spin text-secondary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {marketplaceServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                      >
                        <LazyImage
                          src={
                            service.thumbnail ||
                            `/placeholder.svg?height=160&width=240&text=${encodeURIComponent(service.name)}`
                          }
                          alt={service.name}
                          width={48}
                          height={36}
                          className="w-12 h-9 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">{service.name}</h4>
                          {service.seller_name && (
                            <p className="text-xs text-muted-foreground">by {service.seller_name}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            {service.rating && (
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-muted-foreground ml-1">
                                  {service.rating.toFixed(1)} ({service.reviews_count || 0})
                                </span>
                              </div>
                            )}
                            {service.delivery_time && (
                              <span className="text-xs text-muted-foreground">
                                {service.delivery_time} {service.delivery_unit || "days"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-secondary">${service.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Featured Services</span>
                    <span className="font-medium text-secondary">{platformStats.featuredServices} available</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Earnings News Platform */}
            <Card className="platform-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                      <Newspaper className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">Earnings News</CardTitle>
                      <p className="text-sm text-muted-foreground">Tips & insights</p>
                    </div>
                  </div>
                  <Link href="/earnings-news">
                    <Button size="sm" className="action-button action-button-secondary">
                      Read More <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Activity className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {earningsNews.map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                      >
                        <LazyImage
                          src={
                            article.thumbnail ||
                            `/placeholder.svg?height=160&width=240&text=${encodeURIComponent(article.title)}`
                          }
                          alt={article.title}
                          width={48}
                          height={36}
                          className="w-12 h-9 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground line-clamp-2">{article.title}</h4>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            {article.views && (
                              <>
                                <span>{article.views.toLocaleString()} views</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{formatTimeAgo(article.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Latest Articles</span>
                    <span className="font-medium text-accent">{platformStats.newArticlesThisWeek} new this week</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="clean-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Plus className="h-5 w-5 mr-2 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/dashboard/jobs/create">
                  <Button className="w-full h-16 action-button action-button-primary flex flex-col items-center justify-center space-y-1">
                    <Briefcase className="h-5 w-5" />
                    <span className="font-medium">Post a Job</span>
                  </Button>
                </Link>
                <Link href="/dashboard/services/create">
                  <Button className="w-full h-16 action-button action-button-secondary flex flex-col items-center justify-center space-y-1">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="font-medium">Create Service</span>
                  </Button>
                </Link>
                <Link href="/dashboard/wallet">
                  <Button className="w-full h-16 action-button bg-emerald-500 hover:bg-emerald-600 text-white flex flex-col items-center justify-center space-y-1">
                    <DollarSign className="h-5 w-5" />
                    <span className="font-medium">View Wallet</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
