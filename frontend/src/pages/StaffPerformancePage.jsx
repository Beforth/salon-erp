import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
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
import { TrendingUp, Calendar, Loader2, Star, Pencil, Check, X, Users, IndianRupee, Target } from 'lucide-react'
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

  const defaultRange = useMemo(getDefaultDateRange, [])
  const [startDate, setStartDate] = useState(defaultRange.start_date)
  const [endDate, setEndDate] = useState(defaultRange.end_date)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [activeEmployeeId, setActiveEmployeeId] = useState(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalValue, setGoalValue] = useState('')

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

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['staff-performance', startDate, endDate, selectedBranch, selectedEmployee],
    queryFn: () =>
      reportsService.getEmployeePerformance({
        start_date: startDate,
        end_date: endDate,
        branch_id: selectedBranch || undefined,
        employee_id: selectedEmployee || undefined,
      }),
    enabled: isOwner && !!startDate && !!endDate,
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
          Employee-wise performance for the selected time range
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

              {/* Daily Breakdown Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Daily Breakdown</CardTitle>
                  <CardDescription>
                    {activeEmployee.employee_name} &bull; {startDate} to {endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeEmployee.daily_breakdown && activeEmployee.daily_breakdown.length > 0 ? (
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
                                    className="text-xs"
                                  >
                                    {s.service_name}: {s.contribution_type === 'full' ? 'Full' : `${s.contribution_percent}%`}
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
                        {/* Totals row */}
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
                    {startDate} to {endDate}
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
                </CardHeader>
                <CardContent>
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
