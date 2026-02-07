import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  Users,
  Receipt,
  TrendingUp,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react'
import { reportsService } from '@/services/reports.service'
import LowStockAlertsCard from '@/components/dashboard/LowStockAlertsCard'

function OwnerDashboard() {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true)
        const response = await reportsService.getDashboardStats()
        setStats(response.data)
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value) => {
    if (!value && value !== 0) return '0'
    return new Intl.NumberFormat('en-IN').format(value)
  }

  const getChangeType = (change) => {
    if (!change) return 'neutral'
    return change >= 0 ? 'positive' : 'negative'
  }

  const formatChange = (change) => {
    if (!change && change !== 0) return '0%'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  const statCards = stats ? [
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      change: formatChange(stats.revenueChange),
      changeType: getChangeType(stats.revenueChange),
      icon: DollarSign,
      description: 'This month',
    },
    {
      name: 'Total Bills',
      value: formatNumber(stats.monthlyBills),
      change: formatChange(stats.billsChange),
      changeType: getChangeType(stats.billsChange),
      icon: Receipt,
      description: 'This month',
    },
    {
      name: 'Active Customers',
      value: formatNumber(stats.activeCustomers),
      change: formatChange(stats.customersChange),
      changeType: getChangeType(stats.customersChange),
      icon: Users,
      description: 'Visited this month',
    },
    {
      name: 'Average Bill',
      value: formatCurrency(stats.averageBillValue),
      change: formatChange(stats.avgBillChange),
      changeType: getChangeType(stats.avgBillChange),
      icon: TrendingUp,
      description: 'Per transaction',
    },
  ] : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.fullName || 'Owner'}
          </h1>
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.fullName || 'Owner'}
          </h1>
          <p className="text-red-500">Failed to load dashboard data: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.fullName || 'Owner'}
        </h1>
        <p className="text-gray-500">
          Here's what's happening across your salons today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-gray-500">
                <span
                  className={`flex items-center ${
                    stat.changeType === 'positive'
                      ? 'text-green-600'
                      : stat.changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : stat.changeType === 'negative' ? (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  ) : null}
                  {stat.change}
                </span>
                <span className="ml-2">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branch Performance</CardTitle>
              <CardDescription>
                Revenue comparison across all branches
              </CardDescription>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.branchPerformance && stats.branchPerformance.length > 0 ? (
              stats.branchPerformance.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{branch.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatNumber(branch.billCount)} bills this month
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(branch.revenue)}
                    </p>
                    {branch.growth !== undefined && (
                      <Badge
                        variant={branch.growth >= 0 ? "success" : "destructive"}
                        className="mt-1"
                      >
                        {formatChange(branch.growth)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No branch data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      {stats?.todaySummary && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
            <CardDescription>
              Real-time overview of today's activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.todaySummary.revenue)}
                </p>
                <p className="text-sm text-gray-600">Today's Revenue</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(stats.todaySummary.billCount)}
                </p>
                <p className="text-sm text-gray-600">Bills Created</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(stats.todaySummary.newCustomers)}
                </p>
                <p className="text-sm text-gray-600">New Customers</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {formatNumber(stats.todaySummary.servicesProvided)}
                </p>
                <p className="text-sm text-gray-600">Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      <LowStockAlertsCard maxItems={4} />

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/bills')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View All Bills</p>
              <p className="text-sm text-gray-500">Browse billing history</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/customers')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Manage Customers</p>
              <p className="text-sm text-gray-500">View customer database</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/reports')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Reports</p>
              <p className="text-sm text-gray-500">Analytics & insights</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default OwnerDashboard
