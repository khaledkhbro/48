"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Shield,
  AlertTriangle,
  Users,
  MapPin,
  Calendar,
  MoreHorizontal,
  Ban,
  Eye,
  RefreshCw,
  Search,
} from "lucide-react"
import { suspendUserWithReason } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"

interface SuspiciousIP {
  ip_address: string
  user_count: number
  user_ids: number[]
  first_login: string
  last_login: string
  total_logins: number
}

interface IPUserDetail {
  user_id: number
  username: string
  email: string
  first_name: string
  last_name: string
  user_type: string
  login_count: number
  first_login: string
  last_login: string
  location_data: any
}

export default function IPMonitoringPage() {
  const [suspiciousIPs, setSuspiciousIPs] = useState<SuspiciousIP[]>([])
  const [loading, setLoading] = useState(true)
  const [searchIP, setSearchIP] = useState("")
  const [selectedIP, setSelectedIP] = useState<string | null>(null)
  const [ipUserDetails, setIPUserDetails] = useState<IPUserDetail[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [suspendingUsers, setSuspendingUsers] = useState<Set<number>>(new Set())

  const { user: currentUser } = useAuth()

  useEffect(() => {
    loadSuspiciousIPs()
  }, [])

  const loadSuspiciousIPs = async () => {
    setLoading(true)
    try {
      console.log("[v0] Loading suspicious IPs...")
      const response = await fetch("/api/admin/ip-monitoring")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Received data:", data)
        setSuspiciousIPs(data.suspiciousIPs || [])

        if (data.message) {
          console.log("[v0] System message:", data.message)
        }
      } else {
        console.error("[v0] Failed to load suspicious IPs - HTTP", response.status)
        setSuspiciousIPs([])
      }
    } catch (error) {
      console.error("[v0] Error loading suspicious IPs:", error)
      setSuspiciousIPs([])
    } finally {
      setLoading(false)
    }
  }

  const loadIPUserDetails = async (ipAddress: string) => {
    setDetailsLoading(true)
    try {
      const response = await fetch(`/api/admin/ip-monitoring/${encodeURIComponent(ipAddress)}`)
      if (response.ok) {
        const data = await response.json()
        setIPUserDetails(data.users || [])
      } else {
        console.error("Failed to load IP user details")
      }
    } catch (error) {
      console.error("Error loading IP user details:", error)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleViewDetails = async (ipAddress: string) => {
    setSelectedIP(ipAddress)
    await loadIPUserDetails(ipAddress)
  }

  const handleSuspendUser = async (userId: number, userName: string) => {
    if (!currentUser) return

    const reason = prompt(`Enter suspension reason for ${userName}:`)
    if (!reason) return

    setSuspendingUsers((prev) => new Set(prev).add(userId))
    try {
      await suspendUserWithReason(userId.toString(), reason, currentUser.id)
      alert(`User ${userName} suspended successfully!`)
      // Refresh the details
      if (selectedIP) {
        await loadIPUserDetails(selectedIP)
      }
    } catch (error) {
      console.error("Failed to suspend user:", error)
      alert("Failed to suspend user. Please try again.")
    } finally {
      setSuspendingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleSuspendAllUsers = async (ipAddress: string) => {
    if (!currentUser) return

    const reason = prompt(`Enter suspension reason for all users from IP ${ipAddress}:`)
    if (!reason) return

    const confirmSuspend = confirm(
      `Are you sure you want to suspend ALL ${ipUserDetails.length} users from this IP address?`,
    )
    if (!confirmSuspend) return

    try {
      for (const user of ipUserDetails) {
        if (user.user_type !== "suspended") {
          await suspendUserWithReason(user.user_id.toString(), reason, currentUser.id)
        }
      }
      alert(`All users from IP ${ipAddress} have been suspended!`)
      await loadIPUserDetails(ipAddress)
      await loadSuspiciousIPs() // Refresh main list
    } catch (error) {
      console.error("Failed to suspend users:", error)
      alert("Failed to suspend some users. Please try again.")
    }
  }

  const filteredIPs = suspiciousIPs.filter((ip) => searchIP === "" || ip.ip_address.includes(searchIP))

  const getRiskLevel = (userCount: number, totalLogins: number) => {
    if (userCount >= 5 || totalLogins >= 50) return "high"
    if (userCount >= 3 || totalLogins >= 20) return "medium"
    return "low"
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return <Badge variant="destructive">High Risk</Badge>
      case "medium":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Medium Risk
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Low Risk
          </Badge>
        )
    }
  }

  return (
    <>
      <AdminHeader
        title="IP Address Monitoring"
        description="Monitor and manage users with suspicious IP address patterns"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspicious IPs</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{suspiciousIPs.length}</div>
                <p className="text-xs text-muted-foreground">IPs with multiple users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risk IPs</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {suspiciousIPs.filter((ip) => getRiskLevel(ip.user_count, ip.total_logins) === "high").length}
                </div>
                <p className="text-xs text-muted-foreground">5+ users or 50+ logins</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Affected Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{suspiciousIPs.reduce((sum, ip) => sum + ip.user_count, 0)}</div>
                <p className="text-xs text-muted-foreground">Users from suspicious IPs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{suspiciousIPs.reduce((sum, ip) => sum + ip.total_logins, 0)}</div>
                <p className="text-xs text-muted-foreground">From suspicious IPs</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search IP address..."
                      value={searchIP}
                      onChange={(e) => setSearchIP(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button onClick={loadSuspiciousIPs} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Suspicious IPs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Suspicious IP Addresses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-purple-600 hover:bg-purple-600">
                        <TableHead className="text-white font-semibold">IP Address</TableHead>
                        <TableHead className="text-white font-semibold">User Count</TableHead>
                        <TableHead className="text-white font-semibold">Total Logins</TableHead>
                        <TableHead className="text-white font-semibold">Risk Level</TableHead>
                        <TableHead className="text-white font-semibold">First Login</TableHead>
                        <TableHead className="text-white font-semibold">Last Login</TableHead>
                        <TableHead className="text-white font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIPs.map((ip) => {
                        const riskLevel = getRiskLevel(ip.user_count, ip.total_logins)
                        return (
                          <TableRow key={ip.ip_address} className="hover:bg-gray-50">
                            <TableCell className="font-mono">{ip.ip_address}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{ip.user_count} users</Badge>
                            </TableCell>
                            <TableCell>{ip.total_logins}</TableCell>
                            <TableCell>{getRiskBadge(riskLevel)}</TableCell>
                            <TableCell>{new Date(ip.first_login).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(ip.last_login).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(ip.ip_address)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View User Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleSuspendAllUsers(ip.ip_address)}
                                    className="text-red-600"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Suspend All Users
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {filteredIPs.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-600">
                        {searchIP
                          ? "No suspicious IPs found matching your search."
                          : "No suspicious IP addresses detected."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* IP User Details Dialog */}
      <Dialog open={!!selectedIP} onOpenChange={() => setSelectedIP(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Users from IP: {selectedIP}</DialogTitle>
            <DialogDescription>
              Detailed information about all users who have logged in from this IP address
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Found {ipUserDetails.length} users</h4>
                <Button onClick={() => selectedIP && handleSuspendAllUsers(selectedIP)} variant="destructive" size="sm">
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend All
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Login Count</TableHead>
                      <TableHead>First Login</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipUserDetails.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.user_type === "suspended" ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.login_count}</TableCell>
                        <TableCell>{new Date(user.first_login).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(user.last_login).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {user.location_data ? (
                            <div className="flex items-center text-sm">
                              <MapPin className="h-3 w-3 mr-1" />
                              {user.location_data.city}, {user.location_data.country}
                            </div>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.user_type !== "suspended" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleSuspendUser(user.user_id, `${user.first_name} ${user.last_name}`)}
                              disabled={suspendingUsers.has(user.user_id)}
                            >
                              {suspendingUsers.has(user.user_id) ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Ban className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
