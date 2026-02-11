import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'
import { branchService } from '@/services/branch.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart3,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  Download,
  Scissors,
  Package,
  Star,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export-utils'
import {
  RevenueAreaChart,
  RevenueBarChart,
  DonutChart,
  HorizontalBarChart,
  SimplePieChart,
  SimpleBarChart,
} from '@/components/charts'

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Sales', icon: Calendar },
  { id: 'monthly', label: 'Monthly Revenue', icon: BarChart3 },
  { id: 'customers', label: 'Customer Analytics', icon: Users },
  { id: 'employees', label: 'Employee Performance', icon: Star },
  { id: 'services', label: 'Service Analytics', icon: Scissors },
  { id: 'inventory', label: 'Inventory Report', icon: Package },
]

function ReportsPage() {
  const { user } = useSelector((state) => state.auth)
  const [activeReport, setActiveReport] = useState('daily')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [period, setPeriod] = useState(30)

  const branchId = user?.branchId || null

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
    enabled: !branchId,
  })

  const branches = branchesData?.data || []

  // Daily Sales
  const { data: dailySalesData, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily-sales', selectedDate, selectedBranch],
    queryFn: () => reportsService.getDailySales({
      date: selectedDate,
      branch_id: selectedBranch || undefined
    }),
    enabled: activeReport === 'daily',
  })

  // Monthly Revenue
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['monthly-revenue', selectedYear, selectedMonth, selectedBranch],
    queryFn: () => reportsService.getMonthlyRevenue({
      year: selectedYear,
      month: selectedMonth,
      branch_id: selectedBranch || undefined
    }),
    enabled: activeReport === 'monthly',
  })

  // Customer Analytics
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-analytics', period, selectedBranch],
    queryFn: () => reportsService.getCustomerAnalytics({
      period,
      branch_id: selectedBranch || undefined
    }),
    enabled: activeReport === 'customers',
  })

  // Employee Performance
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee-performance', period, selectedBranch],
    queryFn: () => reportsService.getEmployeePerformance({
      period,
      branch_id: selectedBranch || undefined
    }),
    enabled: activeReport === 'employees',
  })

  // Service Analytics
  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ['service-analytics', period, selectedBranch],
    queryFn: () => reportsService.getServiceAnalytics({
      period,
      branch_id: selectedBranch || undefined
    }),
    enabled: activeReport === 'services',
  })

  // Inventory Report
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: () => reportsService.getInventoryReport({}),
    enabled: activeReport === 'inventory',
  })

  const dailySales = dailySalesData?.data
  const monthly = monthlyData?.data
  const customers = customerData?.data
  const employees = employeeData?.data
  const services = serviceData?.data
  const inventory = inventoryData?.data

  // Export button component with dropdown
  const ExportButton = ({ data, filename, title, summaryCards = [] }) => {
    if (!data || data.length === 0) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => exportToCSV(data, filename)}>
            <FileText className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportToExcel(data, filename, { title })}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportToPDF(data, filename, { title, summaryCards })}>
            <FileText className="h-4 w-4 mr-2" />
            Print / PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">View business insights and performance metrics</p>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((type) => (
          <Button
            key={type.id}
            variant={activeReport === type.id ? 'default' : 'outline'}
            onClick={() => setActiveReport(type.id)}
            className="flex items-center gap-2"
          >
            <type.icon className="h-4 w-4" />
            {type.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {!branchId && (
              <div>
                <Label className="mb-2 block">Branch</Label>
                <select
                  className="h-10 px-3 border rounded-md min-w-[150px]"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeReport === 'daily' && (
              <div>
                <Label className="mb-2 block">Date</Label>
                <input
                  type="date"
                  className="h-10 px-3 border rounded-md"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}

            {activeReport === 'monthly' && (
              <>
                <div>
                  <Label className="mb-2 block">Year</Label>
                  <select
                    className="h-10 px-3 border rounded-md"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {[2024, 2025, 2026].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-2 block">Month</Label>
                  <select
                    className="h-10 px-3 border rounded-md"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {['customers', 'employees', 'services'].includes(activeReport) && (
              <div>
                <Label className="mb-2 block">Period</Label>
                <select
                  className="h-10 px-3 border rounded-md"
                  value={period}
                  onChange={(e) => setPeriod(parseInt(e.target.value))}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Sales Report */}
      {activeReport === 'daily' && (
        <div className="space-y-6">
          {dailyLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : dailySales ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(dailySales.summary.total_revenue)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Bills</p>
                        <p className="text-2xl font-bold">{dailySales.summary.total_bills}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Average Bill</p>
                        <p className="text-2xl font-bold">{formatCurrency(dailySales.summary.average_bill)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Discount</p>
                        <p className="text-2xl font-bold">{formatCurrency(dailySales.summary.total_discount)}</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Payment Modes */}
                <Card>
                  <CardHeader>
                    <CardTitle>By Payment Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailySales.by_payment_mode.length > 0 ? (
                      <DonutChart
                        data={dailySales.by_payment_mode.map(p => ({
                          name: p.payment_mode,
                          value: p.amount,
                        }))}
                        height={280}
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-4">No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Top Services */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailySales.top_services.length > 0 ? (
                      <HorizontalBarChart
                        data={dailySales.top_services.slice(0, 8)}
                        dataKey="revenue"
                        nameKey="service_name"
                        height={280}
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-4">No data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-gray-500">
                No data available for the selected date
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Monthly Revenue Report */}
      {activeReport === 'monthly' && (
        <div className="space-y-6">
          {monthlyLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : monthly ? (
            <>
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(monthly.summary.total_revenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500">Total Bills</p>
                    <p className="text-2xl font-bold">{monthly.summary.total_bills}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500">Avg Daily Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(monthly.summary.average_daily_revenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500">Total Discount</p>
                    <p className="text-2xl font-bold">{formatCurrency(monthly.summary.total_discount)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Breakdown Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Daily Revenue Breakdown</CardTitle>
                  <ExportButton
                    data={monthly.daily_breakdown}
                    filename="monthly_revenue"
                    title={`Monthly Revenue - ${selectedMonth}/${selectedYear}`}
                    summaryCards={[
                      { label: 'Total Revenue', value: formatCurrency(monthly.summary.total_revenue) },
                      { label: 'Total Bills', value: monthly.summary.total_bills },
                      { label: 'Avg Daily', value: formatCurrency(monthly.summary.average_daily_revenue) },
                    ]}
                  />
                </CardHeader>
                <CardContent>
                  <RevenueAreaChart
                    data={monthly.daily_breakdown.map(d => ({
                      ...d,
                      date: d.date.split('-')[2],
                    }))}
                    dataKey="revenue"
                    xKey="date"
                    height={280}
                  />
                </CardContent>
              </Card>

              {/* Branch Breakdown */}
              {monthly.branch_breakdown?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Branch</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RevenueBarChart
                      data={monthly.branch_breakdown}
                      dataKey="revenue"
                      xKey="branch_name"
                      height={280}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Customer Analytics */}
      {activeReport === 'customers' && (
        <div className="space-y-6">
          {customerLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : customers ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500">New Customers (Last {period} days)</p>
                    <p className="text-3xl font-bold">{customers.new_customers}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Demographics */}
                <Card>
                  <CardHeader>
                    <CardTitle>By Gender</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customers.demographics.by_gender.length > 0 ? (
                      <SimplePieChart
                        data={customers.demographics.by_gender.map(g => ({
                          name: g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
                          value: g.count,
                        }))}
                        height={220}
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-4">No data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>By Age Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customers.demographics.by_age.length > 0 ? (
                      <SimpleBarChart
                        data={customers.demographics.by_age.map(a => ({
                          name: a.age_category.charAt(0).toUpperCase() + a.age_category.slice(1),
                          count: a.count,
                        }))}
                        dataKey="count"
                        xKey="name"
                        height={220}
                        color="#ec4899"
                      />
                    ) : (
                      <p className="text-gray-500 text-center py-4">No data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Customers */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Top Customers</CardTitle>
                  <ExportButton
                    data={customers.top_customers}
                    filename="top_customers"
                    title={`Top Customers - Last ${period} Days`}
                    summaryCards={[
                      { label: 'New Customers', value: customers.new_customers },
                    ]}
                  />
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Visits (Period)</TableHead>
                        <TableHead>Total Visits</TableHead>
                        <TableHead className="text-right">Spent (Period)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.top_customers.slice(0, 10).map((c) => (
                        <TableRow key={c.customer_id}>
                          <TableCell className="font-medium">{c.customer_name}</TableCell>
                          <TableCell>{c.phone_masked}</TableCell>
                          <TableCell>{c.visits_in_period}</TableCell>
                          <TableCell>{c.total_visits}</TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(c.total_spent)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* Employee Performance */}
      {activeReport === 'employees' && (
        <div className="space-y-6">
          {employeeLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : employees ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Employee Performance</CardTitle>
                    <CardDescription>Last {period} days</CardDescription>
                  </div>
                  <ExportButton
                    data={employees.employees}
                    filename="employee_performance"
                    title={`Employee Performance - Last ${period} Days`}
                  />
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Services Completed</TableHead>
                        <TableHead>Star Points</TableHead>
                        <TableHead className="text-right">Revenue Generated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.employees.map((e, i) => (
                        <TableRow key={e.employee_id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {i < 3 && (
                                <Badge variant={i === 0 ? 'default' : 'secondary'}>
                                  #{i + 1}
                                </Badge>
                              )}
                              {e.employee_name}
                            </div>
                          </TableCell>
                          <TableCell>{e.services_completed}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              {e.star_points}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(e.revenue_generated)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Employee</CardTitle>
                </CardHeader>
                <CardContent>
                  {employees.employees.length > 0 ? (
                    <HorizontalBarChart
                      data={employees.employees.slice(0, 10)}
                      dataKey="revenue_generated"
                      nameKey="employee_name"
                      height={Math.max(250, employees.employees.slice(0, 10).length * 40)}
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-4">No data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* Service Analytics */}
      {activeReport === 'services' && (
        <div className="space-y-6">
          {serviceLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : services ? (
            <>
              {/* By Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {services.by_category.length > 0 ? (
                    <DonutChart
                      data={services.by_category.map(c => ({
                        name: c.category,
                        value: c.revenue,
                      }))}
                      height={300}
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-4">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Services */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Top Services</CardTitle>
                  <ExportButton
                    data={services.top_services}
                    filename="service_analytics"
                    title={`Service Analytics - Last ${period} Days`}
                  />
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Times Ordered</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.top_services.slice(0, 15).map((s) => (
                        <TableRow key={s.service_id}>
                          <TableCell className="font-medium">{s.service_name}</TableCell>
                          <TableCell>{s.category}</TableCell>
                          <TableCell>{s.times_ordered}</TableCell>
                          <TableCell>{s.quantity_sold}</TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(s.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* Inventory Report */}
      {activeReport === 'inventory' && (
        <div className="space-y-6">
          {inventoryLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inventory ? (
            <>
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="text-2xl font-bold">{inventory.summary.total_items}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500">Stock Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(inventory.summary.total_value)}</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="p-6">
                    <p className="text-sm text-red-500">Low Stock Items</p>
                    <p className="text-2xl font-bold text-red-600">{inventory.summary.low_stock_count}</p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-6">
                    <p className="text-sm text-orange-500">Expiring Soon</p>
                    <p className="text-2xl font-bold text-orange-600">{inventory.summary.expiring_soon_count}</p>
                  </CardContent>
                </Card>
              </div>

              {/* By Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Value by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {inventory.by_category.length > 0 ? (
                    <RevenueBarChart
                      data={inventory.by_category}
                      dataKey="value"
                      xKey="category"
                      height={280}
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-4">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Low Stock Items */}
              {inventory.low_stock_items.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600">Low Stock Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Reorder Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventory.low_stock_items.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell>{item.location}</TableCell>
                            <TableCell className="text-red-600 font-bold">{item.quantity}</TableCell>
                            <TableCell>{item.reorder_level}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default ReportsPage
