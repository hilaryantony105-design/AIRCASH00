"use client"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  Search,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DashboardStats {
  totalUsers: number
  totalConversions: number
  totalVolume: number
  successRate: number
  pendingTransactions: number
  failedTransactions: number
  todayVolume: number
  todayConversions: number
}

interface User {
  id: number
  phoneNumber: string
  name?: string
  totalConversions: number
  totalVolume: number
  lastActivity: string
  status: "active" | "inactive" | "blocked"
  createdAt: string
}

interface Conversion {
  id: number
  referenceCode: string
  phoneNumber: string
  network: "safaricom" | "airtel"
  airtimeAmount: number
  payoutAmount: number
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  createdAt: string
  completedAt?: string
  notes?: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [networkFilter, setNetworkFilter] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchDashboardData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      // No need for manual headers - authentication is handled by cookies
      const [statsRes, usersRes, conversionsRes] = await Promise.all([
        fetch("/api/admin/stats", { credentials: 'include' }),
        fetch("/api/admin/users", { credentials: 'include' }),
        fetch("/api/admin/conversions", { credentials: 'include' }),
      ])

      // Check if any request failed due to authentication
      if (statsRes.status === 401 || usersRes.status === 401 || conversionsRes.status === 401) {
        toast({
          title: "Error",
          description: "Session expired. Please login again.",
          variant: "destructive",
        })
        window.location.href = '/admin/login'
        return
      }

      const [statsData, usersData, conversionsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        conversionsRes.json(),
      ])

      if (statsData.error || usersData.error || conversionsData.error) {
        throw new Error("Failed to fetch data")
      }

      setStats(statsData.data)
      setUsers(usersData.data || [])
      setConversions(conversionsData.data || [])
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRetryConversion = async (conversionId: number) => {
    try {
      const adminToken = localStorage.getItem("adminToken")
      
      if (!adminToken) {
        toast({
          title: "Error",
          description: "Admin token not found. Please login again.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/admin/conversions/${conversionId}/retry`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Conversion retry initiated",
        })
        fetchDashboardData()
      } else {
        throw new Error("Retry failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry conversion",
        variant: "destructive",
      })
    }
  }

  const handleBlockUser = async (userId: number) => {
    try {
      const adminToken = localStorage.getItem("adminToken")
      
      if (!adminToken) {
        toast({
          title: "Error",
          description: "Admin token not found. Please login again.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User blocked successfully",
        })
        fetchDashboardData()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      })
    }
  }

  const exportData = async (type: "users" | "conversions") => {
    try {
      const adminToken = localStorage.getItem("adminToken")
      
      if (!adminToken) {
        toast({
          title: "Error",
          description: "Admin token not found. Please login again.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/admin/export/${type}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      
      if (!response.ok) {
        throw new Error("Export failed")
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      
      toast({
        title: "Success",
        description: `${type} data exported successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      })
    }
  }

  const filteredConversions = conversions.filter((conversion) => {
    const matchesSearch = conversion.phoneNumber.includes(searchTerm) || conversion.referenceCode.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || conversion.status === statusFilter
    const matchesNetwork = networkFilter === "all" || conversion.network === networkFilter

    return matchesSearch && matchesStatus && matchesNetwork
  })

  const filteredUsers = users.filter(
    (user) =>
      user.phoneNumber.includes(searchTerm) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">AirCash Pro Management Console</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchDashboardData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={async () => {
                try {
                  await fetch('/api/admin/logout', { method: 'POST' })
                  window.location.href = '/admin/login'
                } catch (error) {
                  console.error('Logout error:', error)
                }
              }}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {stats.totalVolume.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All time volume</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Conversion success rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Transactions</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.failedTransactions}</div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="conversions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Conversions Tab */}
          <TabsContent value="conversions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Conversion Requests</CardTitle>
                    <CardDescription>Monitor and manage all airtime conversions</CardDescription>
                  </div>
                  <Button onClick={() => exportData("conversions")} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by phone or reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={networkFilter} onValueChange={setNetworkFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Networks</SelectItem>
                      <SelectItem value="safaricom">Safaricom</SelectItem>
                      <SelectItem value="airtel">Airtel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Reference</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">Network</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Payout</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Created</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConversions.map((conversion) => (
                        <tr key={conversion.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-sm">{conversion.referenceCode}</td>
                          <td className="p-2">{conversion.phoneNumber}</td>
                          <td className="p-2">
                            <Badge variant={conversion.network === "safaricom" ? "default" : "secondary"}>
                              {conversion.network}
                            </Badge>
                          </td>
                          <td className="p-2">KES {conversion.airtimeAmount}</td>
                          <td className="p-2">KES {conversion.payoutAmount}</td>
                          <td className="p-2">
                            <Badge
                              variant={
                                conversion.status === "completed"
                                  ? "default"
                                  : conversion.status === "failed"
                                    ? "destructive"
                                    : conversion.status === "processing"
                                      ? "secondary"
                                      : "outline"
                              }
                            >
                              {conversion.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {conversion.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                              {conversion.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                              {conversion.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-gray-600">
                            {new Date(conversion.createdAt).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                              {conversion.status === "failed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetryConversion(conversion.id)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all registered users</CardDescription>
                  </div>
                  <Button onClick={() => exportData("users")} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Phone Number</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Conversions</th>
                        <th className="text-left p-2">Total Volume</th>
                        <th className="text-left p-2">Last Activity</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono">{user.phoneNumber}</td>
                          <td className="p-2">{user.name || "N/A"}</td>
                          <td className="p-2">{user.totalConversions}</td>
                          <td className="p-2">KES {user.totalVolume.toLocaleString()}</td>
                          <td className="p-2 text-sm text-gray-600">
                            {new Date(user.lastActivity).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <Badge
                              variant={
                                user.status === "active"
                                  ? "default"
                                  : user.status === "blocked"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {user.status}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                              {user.status === "active" && (
                                <Button size="sm" variant="destructive" onClick={() => handleBlockUser(user.id)}>
                                  Block
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Network Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Safaricom Success Rate</span>
                      <span className="font-bold">94.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Airtel Success Rate</span>
                      <span className="font-bold">91.8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Processing Time</span>
                      <span className="font-bold">2.3 minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Today's Revenue</span>
                      <span className="font-bold text-green-600">KES 12,450</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>This Month</span>
                      <span className="font-bold text-green-600">KES 245,680</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Margin</span>
                      <span className="font-bold">18.2%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure system parameters and rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Safaricom Rate (%)</label>
                      <Input type="number" defaultValue="82" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Airtel Rate (%)</label>
                      <Input type="number" defaultValue="80" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Min Amount (KES)</label>
                      <Input type="number" defaultValue="50" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Amount (KES)</label>
                      <Input type="number" defaultValue="5000" />
                    </div>
                  </div>
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
