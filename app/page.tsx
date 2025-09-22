"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Search,
  ArrowRight,
  Briefcase,
  Palette,
  Code,
  Camera,
  Music,
  Megaphone,
  Star,
  CheckCircle,
  Users,
  Globe,
  ChevronRight,
  Play,
  Sparkles,
  Shield,
  Zap,
  Heart,
} from "lucide-react"
import { useState } from "react"

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("all")

  const categories = [
    { icon: Code, name: "Programming", count: "2.5k+", color: "bg-blue-500", description: "Web & Mobile Development" },
    { icon: Palette, name: "Design", count: "1.8k+", color: "bg-purple-500", description: "Graphics & UI/UX Design" },
    { icon: Camera, name: "Photography", count: "950+", color: "bg-pink-500", description: "Photo & Video Services" },
    { icon: Music, name: "Audio", count: "720+", color: "bg-orange-500", description: "Music & Voice Over" },
    { icon: Megaphone, name: "Marketing", count: "1.2k+", color: "bg-red-500", description: "Digital Marketing" },
    { icon: Briefcase, name: "Business", count: "890+", color: "bg-indigo-500", description: "Consulting & Strategy" },
    { icon: Globe, name: "Translation", count: "650+", color: "bg-green-500", description: "Language Services" },
    { icon: Users, name: "Social Media", count: "1.1k+", color: "bg-teal-500", description: "Content & Management" },
  ]

  const stats = [
    { label: "Active Users", value: "2.5M+", icon: Users, color: "text-blue-600" },
    { label: "Jobs Completed", value: "15M+", icon: CheckCircle, color: "text-green-600" },
    { label: "Countries", value: "190+", icon: Globe, color: "text-purple-600" },
    { label: "Avg. Rating", value: "4.9/5", icon: Star, color: "text-yellow-600" },
  ]

  const features = [
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Your money is protected with our secure escrow system",
    },
    {
      icon: Zap,
      title: "Fast Delivery",
      description: "Get your projects completed quickly by skilled professionals",
    },
    {
      icon: Heart,
      title: "Quality Guaranteed",
      description: "100% satisfaction guarantee or your money back",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background/95 backdrop-blur-lg border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="text-primary-foreground h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-foreground">WorkHub</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/marketplace"
                className="text-muted-foreground hover:text-secondary transition-colors duration-300"
              >
                Browse Services
              </Link>
              <Link
                href="/how-it-works"
                className="text-muted-foreground hover:text-secondary transition-colors duration-300"
              >
                How It Works
              </Link>
              <Link
                href="/become-seller"
                className="text-muted-foreground hover:text-secondary transition-colors duration-300"
              >
                Become a Seller
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-muted-foreground hover:text-secondary transition-colors duration-300">
                Sign In
              </Link>
              <Button className="action-button action-button-primary">Join Now</Button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative py-16 sm:py-20 lg:py-32 overflow-hidden hero-gradient">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-primary/5 to-accent/10"></div>
        <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] opacity-5"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-secondary/10 text-secondary px-4 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 fade-in-up border border-secondary/20">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Trusted by 2.5M+ professionals worldwide</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-foreground mb-6 sm:mb-8 fade-in-up text-balance leading-tight">
              Find the perfect
              <span className="text-gradient block mt-2">freelance services</span>
              for your business
            </h1>

            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-3xl mx-auto fade-in-up text-pretty leading-relaxed px-4">
              Connect with talented freelancers and get your projects done with quality and speed. From quick tasks to
              complex projects, we've got you covered.
            </p>

            <div className="max-w-3xl mx-auto mb-8 sm:mb-12 fade-in-up px-4">
              <div className="relative">
                <div className="flex flex-col sm:flex-row bg-card rounded-2xl shadow-xl border border-border p-2 sm:p-3 hover:shadow-2xl transition-shadow duration-300 gap-2 sm:gap-0">
                  <Input
                    placeholder="What service are you looking for today?"
                    className="flex-1 border-0 text-base sm:text-lg py-4 sm:py-6 px-4 sm:px-8 bg-transparent focus:ring-0 placeholder:text-muted-foreground"
                  />
                  <Button
                    size="lg"
                    className="action-button-secondary px-6 sm:px-10 py-4 sm:py-6 rounded-xl text-base sm:text-lg mobile-button"
                  >
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    Search
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-12 sm:mb-16 fade-in-up px-4">
              <span className="text-muted-foreground font-medium text-sm sm:text-base">Popular:</span>
              {["Logo Design", "WordPress", "Voice Over", "Video Editing", "Social Media"].map((term) => (
                <Button
                  key={term}
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-card hover:bg-secondary hover:text-secondary-foreground transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2"
                >
                  {term}
                </Button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center fade-in-up px-4">
              <Button size="lg" className="action-button action-button-primary mobile-button">
                Get Started
                <ArrowRight className="ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="mobile-button group bg-card hover:bg-secondary hover:text-secondary-foreground rounded-xl transition-all duration-300"
              >
                <Play className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                Watch How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mobile-stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-background rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className={`h-8 w-8 sm:h-10 sm:w-10 ${stat.color}`} />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-sm sm:text-base lg:text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h2 className="mobile-heading mb-4 sm:mb-6">Explore by Category</h2>
            <p className="mobile-subheading max-w-3xl mx-auto">
              Browse our most popular service categories and find the perfect match for your project
            </p>
          </div>

          <div className="mobile-category-grid">
            {categories.map((category, index) => (
              <Card key={index} className="mobile-card group cursor-pointer category-hover card-gradient-overlay">
                <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 ${category.color} rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <category.icon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-xl font-semibold text-foreground mb-1 sm:mb-2">
                    {category.name}
                  </h3>
                  <p className="text-muted-foreground mb-2 sm:mb-3 text-xs sm:text-sm line-clamp-2">
                    {category.description}
                  </p>
                  <p className="text-secondary font-medium mb-3 sm:mb-4 lg:mb-6 text-xs sm:text-sm">
                    {category.count} services
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group-hover:bg-secondary/10 group-hover:text-secondary transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2"
                  >
                    Explore
                    <ChevronRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h2 className="mobile-heading mb-4 sm:mb-6">Why Choose WorkHub?</h2>
            <p className="mobile-subheading max-w-3xl mx-auto">
              We provide the tools and security you need for successful project completion
            </p>
          </div>

          <div className="mobile-feature-grid">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-secondary group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="h-8 w-8 sm:h-10 sm:w-10 text-secondary group-hover:text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-r from-primary via-secondary to-accent relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Ready to Get Started?</h2>
          <p className="text-xl text-white/90 mb-16 max-w-3xl mx-auto leading-relaxed">
            Join millions of people who use WorkHub to turn their ideas into reality
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" variant="secondary" className="px-12 py-6 text-lg rounded-xl action-button">
              Start as a Buyer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-12 py-6 text-lg border-white text-white hover:bg-white hover:text-primary bg-transparent rounded-xl action-button"
            >
              Become a Seller
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-background py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <Link href="/" className="flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-secondary to-accent rounded-xl flex items-center justify-center">
                  <Briefcase className="text-white h-6 w-6" />
                </div>
                <span className="text-2xl font-bold">WorkHub</span>
              </Link>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Connecting talent with opportunity worldwide. Build your business with confidence and grow your career.
              </p>
              <div className="flex space-x-4">
                {["f", "t", "in", "ig"].map((social) => (
                  <div
                    key={social}
                    className="w-12 h-12 bg-muted/10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-bold uppercase">{social}</span>
                  </div>
                ))}
              </div>
            </div>

            {[
              {
                title: "For Clients",
                links: ["Post a Project", "Browse Services", "How It Works", "Pricing"],
              },
              {
                title: "For Freelancers",
                links: ["Find Work", "Create Profile", "Success Stories", "Resources"],
              },
              {
                title: "Support",
                links: ["Help Center", "Contact Us", "Terms of Service", "Privacy Policy"],
              },
            ].map((section, index) => (
              <div key={index}>
                <h3 className="font-semibold mb-8 text-lg">{section.title}</h3>
                <ul className="space-y-4">
                  {section.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-muted-foreground hover:text-background transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-muted/20 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground">© 2024 WorkHub. All rights reserved.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <select className="bg-muted/10 border border-muted/20 rounded-lg px-4 py-2 text-sm">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
              <select className="bg-muted/10 border border-muted/20 rounded-lg px-4 py-2 text-sm">
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
