import { useState, useMemo, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'
import { branchService } from '@/services/branch.service'
import { userService } from '@/services/user.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { TrendingUp, Calendar, Loader2, Star, Pencil, Check, X, Users, IndianRupee, Target, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { HorizontalBarChart } from '@/components/charts'
import { toast } from 'sonner'

function getDefaultDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    start_date: start.toISOString().split('T')[0],
    end_date: now.toISOString().split('T')[0],
  }
}

function StaffPerformancePage() {
  const { user } = useSelector((state) => state.auth)
  const isOwner = user?.role === 'owner' || user?.role === 'developer'
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const defaultRange = useMemo(getDefaultDateRange, [])
  const [filterMode, setFilterMode] = useState('range') // 'range' | 'single'
  const [startDate, setStartDate] = useState(defaultRange.start_date)
  const [endDate, setEndDate] = useState(defaultRange.end_date)
  const [singleDate, setSingleDate] = useState(defaultRange.end_date)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [activeEmployeeId, setActiveEmployeeId] = useState(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalValue, setGoalValue] = useState('')
  const [matrixPage, setMatrixPage] = useState(1)
  const [matrixPageSize, setMatrixPageSize] = useState(10)

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
    enabled: isOwner,
  })

  const branches = branchesData?.data || []

  const { data: branchEmployeesData } = useQuery({
    queryKey: ['branch-employees', selectedBranch],
    queryFn: () => branchService.getBranchEmployees(selectedBranch),
    enabled: isOwner && !!selectedBranch,
  })

  const branchEmployees = branchEmployeesData?.data || []

  const effectiveStart = filterMode === 'single' ? singleDate : startDate
  const effectiveEnd = filterMode === 'single' ? singleDate : endDate

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['staff-performance', effectiveStart, effectiveEnd, selectedBranch, selectedEmployee, matrixPage, matrixPageSize],
    queryFn: () =>
      reportsService.getEmployeePerformance({
        start_date: effectiveStart,
        end_date: effectiveEnd,
        branch_id: selectedBranch || undefined,
        employee_id: selectedEmployee || undefined,
        page: matrixPage,
        page_size: matrixPageSize,
      }),
    enabled: isOwner && !!effectiveStart && !!effectiveEnd,
  })

  const starGoalMutation = useMutation({
    mutationFn: ({ id, goal }) => userService.updateStarGoal(id, goal),
    onSuccess: () => {
      toast.success('Star goal updated')
      queryClient.invalidateQueries({ queryKey: ['staff-performance'] })
      setEditingGoal(false)
    },
    onError: () => {
      toast.error('Failed to update star goal')
    },
  })

  const handleBranchChange = (branchId) => {
    setSelectedBranch(branchId)
    setSelectedEmployee('')
    setActiveEmployeeId(null)
  }

  const employees = performanceData?.data?.employees || []
  const globalGoal = performanceData?.data?.global_monthly_star_goal || 100
  const isSingleDay = performanceData?.data?.is_single_day === true
  const dailyTimeline = performanceData?.data?.daily_timeline || []
  const dailyTimelineTotal = performanceData?.data?.daily_timeline_total ?? 0

  const activeEmployee = useMemo(() => {
    if (!activeEmployeeId) return null
    return employees.find((e) => e.employee_id === activeEmployeeId) || null
  }, [activeEmployeeId, employees])

  // Compute totals for overview
  const totals = useMemo(() => {
    if (!employees.length) return null
    return {
      services: employees.reduce((s, e) => s + e.services_completed, 0),
      stars: employees.reduce((s, e) => s + e.star_points, 0),
      earnings: employees.reduce((s, e) => s + e.revenue_generated, 0),
    }
  }, [employees])

  // For single day + selected employee: that day's services sorted by time
  const singleDayServicesByTime = useMemo(() => {
    if (!isSingleDay || !activeEmployee?.daily_breakdown?.length) return []
    const dayData = activeEmployee.daily_breakdown.find((d) => d.date === effectiveStart)
    if (!dayData?.services?.length) return []
    return [...dayData.services].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }, [isSingleDay, activeEmployee, effectiveStart])

  // Single-day matrix: backend returns paginated rows (already grouped by bill_item_id)
  const singleDayMatrix = isSingleDay ? dailyTimeline : []
  const matrixTotal = dailyTimelineTotal
  const matrixTotalPages = Math.max(1, Math.ceil(matrixTotal / matrixPageSize))
  const matrixPageSafe = Math.min(matrixPage, matrixTotalPages)

  useEffect(() => {
    setMatrixPage(1)
  }, [effectiveStart, matrixPageSize])

  if (!isOwner) {
    return <Navigate to="/" replace />
  }

  const handleStartGoalEdit = (emp) => {
    setGoalValue(String(emp.monthly_star_goal || globalGoal))
    setEditingGoal(true)
  }

  const handleSaveGoal = () => {
    if (!activeEmployeeId) return
    const parsed = parseInt(goalValue)
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Please enter a valid number')
      return
    }
    starGoalMutation.mutate({ id: activeEmployeeId, goal: parsed })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Performance</h1>
        <p className="text-gray-500">
          {filterMode === 'single'
            ? `Single-day performance with time — hover service for bill number, click to open bill`
            : 'Employee-wise performance for the selected time range'}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Period</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="filterMode"
                    checked={filterMode === 'range'}
                    onChange={() => setFilterMode('range')}
                    className="rounded border-gray-300"
                  />
                  Date range
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="filterMode"
                    checked={filterMode === 'single'}
                    onChange={() => setFilterMode('single')}
                    className="rounded border-gray-300"
                  />
                  Single date
                </label>
              </div>
            </div>
            {filterMode === 'range' && (
              <>
                <div>
                  <Label className="mb-2 block text-xs">From</Label>
                  <input
                    type="date"
                    className="h-9 px-3 border rounded-md border-gray-300 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-xs">To</Label>
                  <input
                    type="date"
                    className="h-9 px-3 border rounded-md border-gray-300 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            {filterMode === 'single' && (
              <div>
                <Label className="mb-2 block text-xs">Date</Label>
                <input
                  type="date"
                  className="h-9 px-3 border rounded-md border-gray-300 text-sm"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label className="mb-2 block text-xs">Branch</Label>
              <select
                className="h-9 px-3 border rounded-md border-gray-300 min-w-[180px] text-sm"
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-2 block text-xs">Employee</Label>
              <select
                className="h-9 px-3 border rounded-md border-gray-300 min-w-[200px] text-sm"
                value={selectedEmployee}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value)
                  setActiveEmployeeId(e.target.value || null)
                }}
                disabled={!selectedBranch}
              >
                <option value="">All Employees</option>
                {branchEmployees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.full_name}
                    {emp.employee_code ? ` (${emp.employee_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Employee Pills */}
          {employees.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !activeEmployeeId
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveEmployeeId(null)}
              >
                All Employees
              </button>
              {employees.map((emp) => (
                <button
                  key={emp.employee_id}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeEmployeeId === emp.employee_id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveEmployeeId(emp.employee_id)}
                >
                  {emp.employee_name}
                  <span className="flex items-center gap-0.5 text-xs opacity-80">
                    <Star className="h-3 w-3 fill-current" />
                    {emp.star_points}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Single-day matrix: Service | Time | Emp1 (total) | Emp2 (total) | ... — below employee chips */}
          {isSingleDay && singleDayMatrix.length > 0 && !activeEmployeeId && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Services by time — {effectiveStart}
                </CardTitle>
                <CardDescription>
                  Employee columns show day total. Each row is a service; cells show amount earned. Click row to open bill.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto min-w-0 w-full" style={{ maxWidth: '100%' }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px] w-[160px] sticky left-0 z-10 bg-white border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                          Service
                        </TableHead>
                        <TableHead className="w-24 min-w-[6rem] font-mono whitespace-nowrap sticky left-[160px] z-10 bg-white border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                          Time
                        </TableHead>
                      {employees.map((emp) => (
                        <TableHead
                          key={emp.employee_id}
                          className="text-right min-w-[110px] cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setActiveEmployeeId(emp.employee_id)}
                          title="Click to see this employee's services by time"
                        >
                          <div className="font-medium">{emp.employee_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {emp.services_completed} {emp.services_completed === 1 ? 'service' : 'services'}
                          </div>
                          <div className="text-xs font-semibold text-green-600 mt-0.5">
                            {formatCurrency(emp.revenue_generated)}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {singleDayMatrix.map((row, idx) => (
                      <TableRow
                        key={row.bill_id ? `${row.bill_id}-${idx}` : idx}
                        className="cursor-pointer hover:bg-primary/5"
                        onClick={() => row.bill_id && navigate(`/bills/${row.bill_id}`)}
                        title={[row.bill_number && `Bill: ${row.bill_number}`, row.book_number && `Book: ${row.book_number}`].filter(Boolean).join(' · ') || undefined}
                      >
                        <TableCell className="font-medium sticky left-0 z-[1] bg-white border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] w-[160px] min-w-[160px]">
                          {row.service_name}
                        </TableCell>
                        <TableCell className="font-mono text-sm sticky left-[160px] z-[1] bg-white border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] w-24 min-w-[6rem]">
                          {row.time}
                        </TableCell>
                        {employees.map((emp) => (
                          <TableCell key={emp.employee_id} className="text-right">
                            {row.amounts && row.amounts[emp.employee_id] != null
                              ? formatCurrency(row.amounts[emp.employee_id])
                              : '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {matrixTotal === 0
                        ? 'No rows'
                        : `Showing ${(matrixPageSafe - 1) * matrixPageSize + 1}–${Math.min(matrixPageSafe * matrixPageSize, matrixTotal)} of ${matrixTotal}`}
                    </span>
                    <select
                      className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                      value={matrixPageSize}
                      onChange={(e) => setMatrixPageSize(Number(e.target.value))}
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>{n} per page</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={matrixPageSafe <= 1}
                      onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[100px] text-center text-sm">
                      Page {matrixPageSafe} of {matrixTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={matrixPageSafe >= matrixTotalPages}
                      onClick={() => setMatrixPage((p) => Math.min(matrixTotalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employee Detail View */}
          {activeEmployee && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium">Services</span>
                    </div>
                    <div className="text-2xl font-bold">{activeEmployee.services_completed}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium">Stars</span>
                    </div>
                    <div className="text-2xl font-bold">{activeEmployee.star_points}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {!editingGoal ? (
                        <>
                          <span className="text-xs text-muted-foreground">
                            Goal: {activeEmployee.monthly_star_goal}
                            {' '}({activeEmployee.monthly_star_goal > 0
                              ? Math.round((activeEmployee.star_points / activeEmployee.monthly_star_goal) * 100)
                              : 0}%)
                          </span>
                          <button
                            onClick={() => handleStartGoalEdit(activeEmployee)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={goalValue}
                            onChange={(e) => setGoalValue(e.target.value)}
                            className="h-6 w-20 text-xs px-2"
                          />
                          <button onClick={handleSaveGoal} className="text-green-600 hover:text-green-700">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditingGoal(false)} className="text-red-500 hover:text-red-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, activeEmployee.monthly_star_goal > 0
                            ? (activeEmployee.star_points / activeEmployee.monthly_star_goal) * 100
                            : 0)}%`,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <IndianRupee className="h-4 w-4" />
                      <span className="text-xs font-medium">Total Earnings</span>
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(activeEmployee.revenue_generated)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Target className="h-4 w-4" />
                      <span className="text-xs font-medium">Daily Avg</span>
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(activeEmployee.daily_avg_earnings)}</div>
                    <span className="text-xs text-muted-foreground">
                      {activeEmployee.daily_avg_stars} stars/day
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Breakdown: time-ordered when single day, else by date */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {isSingleDay ? 'Services by time' : 'Daily Breakdown'}
                  </CardTitle>
                  <CardDescription>
                    {activeEmployee.employee_name} &bull; {effectiveStart}{effectiveStart !== effectiveEnd ? ` to ${effectiveEnd}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSingleDay && singleDayServicesByTime.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Service</TableHead>
                          <TableHead className="w-20">Time</TableHead>
                          <TableHead>Split</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Stars</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {singleDayServicesByTime.map((s, i) => (
                          <TableRow
                            key={i}
                            className="cursor-pointer hover:bg-primary/5"
                            onClick={() => s.bill_id && navigate(`/bills/${s.bill_id}`)}
                            title={[s.bill_number && `Bill: ${s.bill_number}`, s.book_number && `Book: ${s.book_number}`].filter(Boolean).join(' · ') || undefined}
                          >
                            <TableCell className="font-medium">{s.service_name}</TableCell>
                            <TableCell className="font-mono text-sm">{s.time || '—'}</TableCell>
                            <TableCell>
                              {s.contribution_type === 'full' ? (
                                <span className="text-muted-foreground text-sm">Full</span>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  {s.contribution_percent}%
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(s.earnings)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="flex items-center justify-end gap-1">
                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                {s.stars}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t-2 bg-muted/50">
                          <TableCell>Total</TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(activeEmployee.revenue_generated)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="flex items-center justify-end gap-1">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                              {activeEmployee.star_points}
                            </span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : activeEmployee.daily_breakdown && activeEmployee.daily_breakdown.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Services</TableHead>
                          <TableHead>Contribution</TableHead>
                          <TableHead>Stars</TableHead>
                          <TableHead className="text-right">Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeEmployee.daily_breakdown.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </TableCell>
                            <TableCell>{day.services_count}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {day.services.map((s, i) => (
                                  <Badge
                                    key={i}
                                    variant={s.contribution_type === 'full' ? 'default' : 'secondary'}
                                    className="text-xs cursor-pointer hover:ring-2 hover:ring-primary/50"
                                    title={[s.bill_number && `Bill: ${s.bill_number}`, s.book_number && `Book: ${s.book_number}`].filter(Boolean).join(' · ') || undefined}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (s.bill_id) navigate(`/bills/${s.bill_id}`)
                                    }}
                                  >
                                    {s.time ? `${s.time} ` : ''}{s.service_name}: {s.contribution_type === 'full' ? 'Full' : `${s.contribution_percent}%`}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                {day.stars}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(day.earnings)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t-2 bg-muted/50">
                          <TableCell>Total</TableCell>
                          <TableCell>{activeEmployee.services_completed}</TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              {activeEmployee.star_points}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(activeEmployee.revenue_generated)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-gray-500 text-center py-6 text-sm">
                      No data for this employee in the selected period
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Overview (when no specific employee is selected) */}
          {!activeEmployee && employees.length > 0 && (
            <>
              {/* Summary Row */}
              {totals && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-5 pb-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Total Services</div>
                      <div className="text-2xl font-bold">{totals.services}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5 pb-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Total Stars</div>
                      <div className="text-2xl font-bold flex items-center justify-center gap-1">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        {Math.round(totals.stars * 100) / 100}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5 pb-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Total Earnings</div>
                      <div className="text-2xl font-bold">{formatCurrency(totals.earnings)}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Employee Performance
                  </CardTitle>
                  <CardDescription>
                    {effectiveStart}{effectiveStart !== effectiveEnd ? ` to ${effectiveEnd}` : ''}
                    {selectedBranch && ` \u2022 ${branches.find((b) => b.branch_id === selectedBranch)?.name || 'Branch'}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Stars</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((e) => (
                        <TableRow
                          key={e.employee_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setActiveEmployeeId(e.employee_id)}
                        >
                          <TableCell className="font-medium">{e.employee_name}</TableCell>
                          <TableCell>{e.services_completed}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                              <span>{e.star_points}</span>
                              <span className="text-xs text-muted-foreground">/ {e.monthly_star_goal}</span>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Employee</CardTitle>
                  <CardDescription>
                    Employee name, revenue generated, and total services in the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Services</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((e) => (
                        <TableRow key={e.employee_id}>
                          <TableCell className="font-medium">{e.employee_name}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(e.revenue_generated)}
                          </TableCell>
                          <TableCell className="text-right">{e.services_completed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <HorizontalBarChart
                    data={employees.slice(0, 15)}
                    dataKey="revenue_generated"
                    nameKey="employee_name"
                    height={Math.max(250, Math.min(employees.length, 15) * 40)}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {employees.length === 0 && !isLoading && (
            <Card>
              <CardContent className="py-16">
                <p className="text-gray-500 text-center">
                  No employee data for the selected time range
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default StaffPerformancePage
