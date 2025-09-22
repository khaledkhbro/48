"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Star,
  MapPin,
  Verified,
  MessageCircle,
  ExternalLink,
  Eye,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  Users,
  DollarSign,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ProfileShareModal } from "@/components/sharing/profile-share-modal"
import { QuickShareButtons } from "@/components/sharing/quick-share-buttons"
import { SellerReviewsSection } from "@/components/seller/seller-reviews-section"

interface SellerProfile {
  id: string
  username: string
  firstName: string
  lastName: string
  profileTitle: string
  profileTagline: string
  bio: string
  location: string
  joinedAt: string
  isVerified: boolean
  rating: number
  totalReviews: number
  skills: string[]

  // Public profile settings
  showEarnings: boolean
  showTotalEarnings: boolean
  showYearlyEarnings: boolean
  showMonthlyEarnings: boolean
  showLastMonthEarnings: boolean

  // Statistics
  totalEarnings: number
  yearlyEarnings: number
  monthlyEarnings: number
  lastMonthEarnings: number
  totalOrders: number
  completedOrders: number
  onTimeDeliveryRate: number
  responseTime: string
  lastActive: string

  // Social links
  websiteUrl?: string
  linkedinUrl?: string

  // Services
  services: {
    id: string
    title: string
    shortDescription: string
    price: number
    rating: number
    totalOrders: number
    imageUrl: string
    deliveryTime: string
  }[]

  // Reviews
  reviews: {
    id: string
    rating: number
    comment: string
    clientName: string
    clientAvatar?: string
    projectTitle: string
    createdAt: string
  }[]

  // Achievements
  achievements: {
    id: string
    name: string
    description: string
    icon: string
    earnedAt: string
  }[]

  // Earnings chart data
  earningsChart: {
    month: string
    earnings: number
  }[]
}

const mockSellerProfile: SellerProfile = {
  id: "seller-123",
  username: "sarah_designer",
  firstName: "Sarah",
  lastName: "Johnson",
  profileTitle: "Professional UI/UX Designer & Brand Strategist",
  profileTagline: "Creating beautiful, user-centered designs that drive results",
  bio: "I'm a passionate UI/UX designer with over 6 years of experience helping businesses create exceptional digital experiences. I specialize in web design, mobile app interfaces, and complete brand identity systems. My approach combines user research, creative design, and strategic thinking to deliver solutions that not only look great but also achieve your business goals.\n\nI've worked with startups, Fortune 500 companies, and everything in between. Whether you need a complete website redesign, a mobile app interface, or a comprehensive brand identity, I'm here to bring your vision to life.",
  location: "San Francisco, CA",
  joinedAt: "2022-03-15T10:00:00Z",
  isVerified: true,
  rating: 4.9,
  totalReviews: 247,
  skills: [
    "UI/UX Design",
    "Figma",
    "Adobe Creative Suite",
    "Prototyping",
    "User Research",
    "Brand Design",
    "Webflow",
    "React",
  ],

  // Public earnings display settings
  showEarnings: true,
  showTotalEarnings: true,
  showYearlyEarnings: true,
  showMonthlyEarnings: true,
  showLastMonthEarnings: true,

  // Statistics
  totalEarnings: 125000,
  yearlyEarnings: 85000,
  monthlyEarnings: 12500,
  lastMonthEarnings: 11200,
  totalOrders: 189,
  completedOrders: 186,
  onTimeDeliveryRate: 98.5,
  responseTime: "< 2 hours",
  lastActive: "2024-01-20T14:30:00Z",

  // Social links
  websiteUrl: "https://sarahdesigns.com",
  linkedinUrl: "https://linkedin.com/in/sarahjohnson",

  // Services
  services: [
    {
      id: "1",
      title: "Custom Website Design & Development",
      shortDescription: "Professional website design with modern UI/UX and responsive development",
      price: 1200,
      rating: 4.9,
      totalOrders: 45,
      imageUrl: "/website-design-concept.png",
      deliveryTime: "7 days",
    },
    {
      id: "2",
      title: "Mobile App UI/UX Design",
      shortDescription: "Complete mobile app interface design with user research and prototyping",
      price: 1800,
      rating: 5.0,
      totalOrders: 32,
      imageUrl: "/mobile-app-ui.png",
      deliveryTime: "10 days",
    },
    {
      id: "3",
      title: "Brand Identity Package",
      shortDescription: "Logo design, brand guidelines, and complete visual identity system",
      price: 800,
      rating: 4.8,
      totalOrders: 28,
      imageUrl: "/brand-identity-concept.png",
      deliveryTime: "5 days",
    },
  ],

  // Reviews
  reviews: [
    {
      id: "1",
      rating: 5,
      comment:
        "Sarah exceeded all expectations! Her design work is exceptional and she really understood our brand vision. The mobile app redesign has significantly improved our user engagement. Highly professional and delivered on time.",
      clientName: "Michael Chen",
      clientAvatar: "/placeholder.svg?height=40&width=40",
      projectTitle: "E-commerce Mobile App Redesign",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "2",
      rating: 5,
      comment:
        "Outstanding work on our SaaS dashboard. Sarah's attention to detail and understanding of user experience is remarkable. The new design has made our complex data much more accessible to users.",
      clientName: "Lisa Rodriguez",
      clientAvatar: "/placeholder.svg?height=40&width=40",
      projectTitle: "SaaS Dashboard Design",
      createdAt: "2024-01-10T10:00:00Z",
    },
    {
      id: "3",
      rating: 5,
      comment:
        "Perfect brand identity work! Sarah created a cohesive visual system that perfectly represents our company values. The logo and brand guidelines are exactly what we needed.",
      clientName: "David Park",
      clientAvatar: "/placeholder.svg?height=40&width=40",
      projectTitle: "Brand Identity Package",
      createdAt: "2024-01-05T10:00:00Z",
    },
  ],

  // Achievements
  achievements: [
    {
      id: "1",
      name: "Top Seller",
      description: "Achieved top seller status with 98% client satisfaction",
      icon: "🏆",
      earnedAt: "2023-12-01T10:00:00Z",
    },
    {
      id: "2",
      name: "Fast Delivery",
      description: "Consistently delivers projects ahead of schedule",
      icon: "⚡",
      earnedAt: "2023-11-15T10:00:00Z",
    },
    {
      id: "3",
      name: "Quality Work",
      description: "Maintains 4.9+ star rating across all projects",
      icon: "⭐",
      earnedAt: "2023-10-20T10:00:00Z",
    },
  ],

  // Earnings chart data
  earningsChart: [
    { month: "Jul", earnings: 8500 },
    { month: "Aug", earnings: 9200 },
    { month: "Sep", earnings: 10800 },
    { month: "Oct", earnings: 11200 },
    { month: "Nov", earnings: 12500 },
    { month: "Dec", earnings: 13800 },
  ],
}

export default function SellerProfilePage() {
  const params = useParams()
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileViews, setProfileViews] = useState(1247)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("about")

  const aboutRef = useRef<HTMLDivElement>(null)
  const servicesRef = useRef<HTMLDivElement>(null)
  const reviewsRef = useRef<HTMLDivElement>(null)
  const earningsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800))
        setProfile(mockSellerProfile)

        // Track profile view
        setProfileViews((prev) => prev + 1)
      } catch (error) {
        console.error("Failed to load seller profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [params.username])

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: "about", ref: aboutRef },
        { id: "services", ref: servicesRef },
        { id: "reviews", ref: reviewsRef },
        { id: "earnings", ref: earningsRef },
      ]

      const scrollPosition = window.scrollY + 200

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        if (section.ref.current && section.ref.current.offsetTop <= scrollPosition) {
          setActiveSection(section.id)
          break
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const refs = {
      about: aboutRef,
      services: servicesRef,
      reviews: reviewsRef,
      earnings: earningsRef,
    }

    const targetRef = refs[sectionId as keyof typeof refs]
    if (targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.firstName} ${profile?.lastName} - ${profile?.profileTitle}`,
          text: profile?.profileTagline,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      setShareModalOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Seller not found</h1>
          <p className="text-muted-foreground mb-6">The seller profile you're looking for doesn't exist.</p>
          <Link href="/marketplace">
            <Button>Browse Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="seller-profile-header py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-6 md:gap-8 items-start">
              {/* Profile Info */}
              <div className="lg:col-span-2">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                  <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white shadow-lg mx-auto md:mx-0">
                    <AvatarImage src="/placeholder.svg?height=128&width=128" alt={profile.firstName} />
                    <AvatarFallback className="text-2xl md:text-3xl bg-primary text-primary-foreground">
                      {profile.firstName[0]}
                      {profile.lastName[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground text-balance">
                        {profile.firstName} {profile.lastName}
                      </h1>
                      {profile.isVerified && <Verified className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
                    </div>

                    <h2 className="text-lg md:text-xl text-muted-foreground mb-3 text-balance">
                      {profile.profileTitle}
                    </h2>
                    <p className="text-base md:text-lg text-accent font-medium mb-4 text-pretty">
                      {profile.profileTagline}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Member since {formatDistanceToNow(new Date(profile.joinedAt), { addSuffix: true })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {profileViews.toLocaleString()} profile views
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 md:gap-2 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 text-yellow-400 fill-current" />
                          <span className="font-bold text-lg">{profile.rating}</span>
                        </div>
                        <span className="text-muted-foreground">({profile.totalReviews} reviews)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Responds in {profile.responseTime}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {profile.skills.slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary">
                          {skill}
                        </Badge>
                      ))}
                      {profile.skills.length > 6 && <Badge variant="outline">+{profile.skills.length - 6} more</Badge>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Actions */}
              <div className="space-y-4">
                <Button size="lg" className="w-full">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Contact Me
                </Button>

                <QuickShareButtons
                  profileUrl={typeof window !== "undefined" ? window.location.href : ""}
                  sellerName={`${profile.firstName} ${profile.lastName}`}
                  sellerTitle={profile.profileTitle}
                  onOpenModal={() => setShareModalOpen(true)}
                />

                {profile.websiteUrl && (
                  <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
                    <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                )}

                {/* Quick Stats */}
                <Card className="earnings-card">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{profile.completedOrders}</div>
                        <div className="text-xs text-muted-foreground">Orders Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{profile.onTimeDeliveryRate}%</div>
                        <div className="text-xs text-muted-foreground">On-Time Delivery</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Achievements */}
                {profile.achievements.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {profile.achievements.slice(0, 3).map((achievement) => (
                          <div key={achievement.id} className="flex items-center gap-2 text-sm">
                            <span className="text-lg">{achievement.icon}</span>
                            <span className="font-medium">{achievement.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <nav className="flex justify-center py-4">
              <div className="flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide">
                {[
                  { id: "about", label: "About" },
                  { id: "services", label: "Services" },
                  { id: "reviews", label: "Reviews" },
                  ...(profile.showEarnings ? [{ id: "earnings", label: "Earnings" }] : []),
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`px-3 md:px-4 py-2 text-sm font-medium transition-colors rounded-md whitespace-nowrap ${
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-6xl mx-auto space-y-12 md:space-y-16">
          {/* About Section */}
          <section ref={aboutRef} id="about" className="scroll-mt-24">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">About Me</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
                      {profile.bio}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">Skills & Expertise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Services Section */}
          <section ref={servicesRef} id="services" className="scroll-mt-24">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">My Services</h2>
                <p className="text-muted-foreground text-sm md:text-base">
                  Professional services tailored to your needs
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.services.map((service) => (
                  <Card key={service.id} className="premium-card service-card-hover">
                    <CardContent className="p-0">
                      <div className="aspect-video relative overflow-hidden rounded-t-lg">
                        <img
                          src={service.imageUrl || "/placeholder.svg?height=200&width=300"}
                          alt={service.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 md:p-6">
                        <h3 className="font-bold text-base md:text-lg mb-2 text-balance">{service.title}</h3>
                        <p className="text-muted-foreground text-sm mb-4 text-pretty line-clamp-3">
                          {service.shortDescription}
                        </p>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="font-medium text-sm">{service.rating}</span>
                            <span className="text-muted-foreground text-xs">({service.totalOrders})</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Starting at</div>
                            <div className="text-lg md:text-xl font-bold text-primary">${service.price}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {service.deliveryTime} delivery
                          </div>
                        </div>

                        <Link href={`/marketplace/${service.id}`}>
                          <Button className="w-full">View Service</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Reviews Section */}
          <section ref={reviewsRef} id="reviews" className="scroll-mt-24">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">Client Reviews</h2>
                <p className="text-muted-foreground text-sm md:text-base">What my clients say about working with me</p>
              </div>

              <SellerReviewsSection sellerId={profile.id} />
            </div>
          </section>

          {/* Earnings Section */}
          {profile.showEarnings && (
            <section ref={earningsRef} id="earnings" className="scroll-mt-24">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">
                    Earnings Overview
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base">
                    Transparent view of my professional success
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {profile.showTotalEarnings && (
                    <Card className="earnings-card">
                      <CardContent className="p-4 md:p-6 text-center">
                        <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                        <div className="text-lg md:text-2xl font-bold text-primary">
                          ${profile.totalEarnings.toLocaleString()}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">Total Earnings</div>
                      </CardContent>
                    </Card>
                  )}

                  {profile.showYearlyEarnings && (
                    <Card className="earnings-card">
                      <CardContent className="p-4 md:p-6 text-center">
                        <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                        <div className="text-lg md:text-2xl font-bold text-primary">
                          ${profile.yearlyEarnings.toLocaleString()}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">This Year</div>
                      </CardContent>
                    </Card>
                  )}

                  {profile.showMonthlyEarnings && (
                    <Card className="earnings-card">
                      <CardContent className="p-4 md:p-6 text-center">
                        <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                        <div className="text-lg md:text-2xl font-bold text-primary">
                          ${profile.monthlyEarnings.toLocaleString()}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">This Month</div>
                      </CardContent>
                    </Card>
                  )}

                  {profile.showLastMonthEarnings && (
                    <Card className="earnings-card">
                      <CardContent className="p-4 md:p-6 text-center">
                        <Users className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                        <div className="text-lg md:text-2xl font-bold text-primary">
                          ${profile.lastMonthEarnings.toLocaleString()}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">Last Month</div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Earnings Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 md:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={profile.earningsChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip
                            formatter={(value) => [`$${value}`, "Earnings"]}
                            labelFormatter={(label) => `Month: ${label}`}
                          />
                          <Line
                            type="monotone"
                            dataKey="earnings"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Profile Share Modal */}
      <ProfileShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        profileUrl={typeof window !== "undefined" ? window.location.href : ""}
        sellerName={`${profile?.firstName} ${profile?.lastName}`}
        sellerTitle={profile?.profileTitle || ""}
      />
    </div>
  )
}
