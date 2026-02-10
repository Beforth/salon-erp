import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'
import { branchService } from '@/services/branch.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Calendar, Loader2, Star } from 'lucide-react'
import { HorizontalBarChart } from '@/components/charts'

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

  const defaultRange = useMemo(getDefaultDateRange, [])
  const [startDate, setStartDate] = useState(defaultRange.start_date)
  const [endDate, setEndDate] = useState(defaultRange.end_date)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')

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

  const handleBranchChange = (branchId) => {
    setSelectedBranch(branchId)
    setSelectedEmployee('')
  }

  const employees = performanceData?.data?.employees || []

  if (!isOwner) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Performance</h1>
        <p className="text-gray-500">
          Employee-wise performance for the selected time range
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select time range
          </CardTitle>
          <CardDescription>
            Choose start and end dates to view employee performance for that period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="mb-2 block">From</Label>
              <input
                type="date"
                className="h-10 px-3 border rounded-md border-gray-300"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">To</Label>
              <input
                type="date"
                className="h-10 px-3 border rounded-md border-gray-300"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Branch</Label>
              <select
                className="h-10 px-3 border rounded-md border-gray-300 min-w-[180px]"
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
              <Label className="mb-2 block">Employee</Label>
              <select
                className="h-10 px-3 border rounded-md border-gray-300 min-w-[200px]"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
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
              {selectedBranch && branchEmployees.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No employees in this branch</p>
              )}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Employee performance
              </CardTitle>
              <CardDescription>
                {startDate} to {endDate}
                {selectedBranch && ` • ${branches.find((b) => b.branch_id === selectedBranch)?.name || 'Branch'}`}
                {selectedEmployee && ` • ${branchEmployees.find((e) => e.employee_id === selectedEmployee)?.full_name || 'Employee'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-gray-500 text-center py-10">
                  No employee data for the selected time range
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Services completed</TableHead>
                      <TableHead>Star points</TableHead>
                      <TableHead className="text-right">Revenue generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e, i) => (
                      <TableRow key={e.employee_id}>
                        <TableCell className="font-medium">{e.employee_name}</TableCell>
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
              )}
            </CardContent>
          </Card>

          {employees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by employee</CardTitle>
                <CardDescription>Selected period</CardDescription>
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
          )}
        </div>
      )}
    </div>
  )
}

export default StaffPerformancePage
