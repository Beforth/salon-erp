import { useState, useMemo, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import {
  Loader2,
  Lock,
  RefreshCw,
  Wallet,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { branchService } from '@/services/branch.service'
import { employeeIncentiveService } from '@/services/employeeIncentive.service'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
}))

const YEARS = (() => {
  const now = new Date().getUTCFullYear()
  const out = []
  for (let y = now - 1; y <= now + 1; y += 1) out.push(y)
  return out
})()

function priorityLabel(p) {
  if (p === 1) return { text: 'P1 — Sales', tone: 'bg-emerald-100 text-emerald-800' }
  if (p === 2) return { text: 'P2 — Service tier', tone: 'bg-blue-100 text-blue-800' }
  if (p === 3) return { text: 'P3 — Daily', tone: 'bg-amber-100 text-amber-800' }
  return { text: 'No priority hit', tone: 'bg-gray-100 text-gray-700' }
}

export default function StaffIncentivesReport() {
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()
  const isOwner = user?.role === 'owner' || user?.role === 'developer'

  const today = new Date()
  const [year, setYear] = useState(today.getUTCFullYear())
  const [month, setMonth] = useState(today.getUTCMonth() + 1)
  const [branchId, setBranchId] = useState('')
  const [expanded, setExpanded] = useState({})

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
  })
  const branches = branchesData?.data?.data || branchesData?.data || []

  const queryKey = useMemo(
    () => ['employee-incentives', { year, month, branchId: branchId || null }],
    [year, month, branchId]
  )

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      employeeIncentiveService.list({
        year,
        month,
        ...(branchId ? { branchId } : {}),
      }),
  })

  const rows = data?.data?.data || []

  const lockMutation = useMutation({
    mutationFn: () =>
      employeeIncentiveService.lock({ year, month, ...(branchId ? { branchId } : {}) }),
    onSuccess: (resp) => {
      toast.success(`Locked ${resp?.data?.data?.results?.length || 0} employee(s) for ${month}/${year}`)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to lock month'),
  })

  const recomputeMutation = useMutation({
    mutationFn: (employeeIds) =>
      employeeIncentiveService.recompute({ year, month, employeeIds }),
    onSuccess: () => {
      toast.success('Recomputed')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to recompute'),
  })

  const disburseMutation = useMutation({
    mutationFn: (employeeIds) =>
      employeeIncentiveService.disburse({
        year,
        month,
        ...(employeeIds ? { employeeIds } : {}),
      }),
    onSuccess: (resp) => {
      const results = resp?.data?.data?.results || []
      const ok = results.filter((r) => r.status === 'disbursed').length
      const skipped = results.length - ok
      toast.success(
        `Disbursed ${ok} expense row(s)${skipped ? ` (${skipped} skipped)` : ''}`
      )
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to disburse'),
  })

  const totals = useMemo(() => {
    let revenue = 0
    let count = 0
    let monthly = 0
    let punctuality = 0
    let total = 0
    for (const r of rows) {
      revenue += Number(r.service_revenue || 0)
      count += Number(r.service_count || 0)
      monthly += Number(r.monthly_amount || 0)
      punctuality += Number(r.punctuality_amount || 0)
      total += Number(r.total_incentive || 0)
    }
    return { revenue, count, monthly, punctuality, total }
  }, [rows])

  const anyLocked = rows.some((r) => r.locked_at)
  const anyDisbursed = rows.some((r) => r.disbursed_at)
  const allLocked = rows.length > 0 && rows.every((r) => r.locked_at)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Staff Incentives</CardTitle>
              <CardDescription>
                Per-employee monthly incentive computed from bills, attendance, and the
                branch incentive config. Live by default; lock the month to freeze numbers
                for payroll.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <Label className="text-xs">Year</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Month</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Branch</Label>
                <Select value={branchId || 'all'} onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.branch_id || b.id} value={b.branch_id || b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="p-3 rounded border">
              <div className="text-xs text-gray-500">Service revenue</div>
              <div className="text-lg font-semibold">{formatCurrency(totals.revenue)}</div>
            </div>
            <div className="p-3 rounded border">
              <div className="text-xs text-gray-500">Services</div>
              <div className="text-lg font-semibold">{totals.count}</div>
            </div>
            <div className="p-3 rounded border">
              <div className="text-xs text-gray-500">Monthly bonus</div>
              <div className="text-lg font-semibold">{formatCurrency(totals.monthly)}</div>
            </div>
            <div className="p-3 rounded border">
              <div className="text-xs text-gray-500">Punctuality</div>
              <div className="text-lg font-semibold">{formatCurrency(totals.punctuality)}</div>
            </div>
            <div className="p-3 rounded border bg-primary/5 border-primary/20">
              <div className="text-xs text-gray-500">Total payout</div>
              <div className="text-lg font-bold text-primary">{formatCurrency(totals.total)}</div>
            </div>
          </div>

          {/* Actions */}
          {isOwner && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh live
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (window.confirm(`Lock ${month}/${year} for payroll? Subsequent edits to bills won't change the locked numbers.`)) {
                    lockMutation.mutate()
                  }
                }}
                disabled={lockMutation.isPending}
              >
                <Lock className="h-3 w-3 mr-1" />
                {anyLocked ? 'Re-lock month' : 'Lock month for payroll'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (window.confirm(`Recompute all locked snapshots for ${month}/${year}? Disbursed rows are skipped.`)) {
                    recomputeMutation.mutate(undefined)
                  }
                }}
                disabled={!anyLocked || recomputeMutation.isPending}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Recompute snapshot
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (window.confirm(`Create Expense rows for all undisbursed locked employees in ${month}/${year}?`)) {
                    disburseMutation.mutate(undefined)
                  }
                }}
                disabled={!allLocked || disburseMutation.isPending}
              >
                <Wallet className="h-3 w-3 mr-1" /> Disburse all
              </Button>
            </div>
          )}

          {!allLocked && rows.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3 flex items-start gap-2">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Numbers below are <strong>projected</strong> (live). Lock the month to freeze
              them before disbursing.
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              No employees with base salary configured. Set a base salary on the staff
              form to include an employee in incentive computation.
            </div>
          ) : (
            <div className="border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Base salary</TableHead>
                    <TableHead className="text-right">Services</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead className="text-right">Punctuality</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const open = !!expanded[r.employee_id]
                    const lab = priorityLabel(r.priority_applied)
                    return (
                      <Fragment key={r.employee_id}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            setExpanded((s) => ({ ...s, [r.employee_id]: !s[r.employee_id] }))
                          }
                        >
                          <TableCell>
                            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.full_name}
                            <div className="text-xs text-gray-500">{r.branch_name}</div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(r.base_salary)}</TableCell>
                          <TableCell className="text-right">{r.service_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.service_revenue)}</TableCell>
                          <TableCell>
                            <span className={`inline-block px-2 py-0.5 text-xs rounded ${lab.tone}`}>
                              {lab.text}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(r.monthly_amount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.punctuality_amount)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(r.total_incentive)}
                          </TableCell>
                          <TableCell>
                            {r.disbursed_at ? (
                              <Badge variant="default">Disbursed</Badge>
                            ) : r.locked_at ? (
                              <Badge variant="secondary">Locked</Badge>
                            ) : (
                              <Badge variant="outline">Live</Badge>
                            )}
                          </TableCell>
                        </TableRow>

                        {open && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 px-2">
                                {/* Priority math */}
                                <div>
                                  <div className="text-sm font-semibold mb-2">Priority math</div>
                                  <ul className="text-xs space-y-1 text-gray-700">
                                    <li>
                                      <strong>P1</strong>: revenue ≥{' '}
                                      {formatCurrency(r.p1_threshold)} →{' '}
                                      {r.p1_eligible ? (
                                        <span className="text-emerald-700">Eligible (10% of revenue)</span>
                                      ) : (
                                        <span className="text-gray-500">Not met</span>
                                      )}
                                    </li>
                                    <li>
                                      <strong>P2</strong>: services tier match →{' '}
                                      {r.p2_tier_matched ? (
                                        <span className="text-blue-700">
                                          ≥{r.p2_tier_matched.minServices} services →{' '}
                                          {(r.p2_tier_matched.rate * 100).toFixed(0)}% × base
                                        </span>
                                      ) : (
                                        <span className="text-gray-500">Not used</span>
                                      )}
                                    </li>
                                    <li>
                                      <strong>P3</strong>: qualifying days ={' '}
                                      {r.priority_applied === 3 ? (
                                        <span className="text-amber-700">{r.p3_days_qualifying}</span>
                                      ) : (
                                        <span className="text-gray-500">Not used</span>
                                      )}
                                    </li>
                                  </ul>
                                </div>
                                {/* Punctuality breakdown */}
                                <div>
                                  <div className="text-sm font-semibold mb-2">Punctuality breakdown</div>
                                  {r.punctuality_breakdown && r.punctuality_breakdown.length > 0 ? (
                                    <ul className="text-xs space-y-1 text-gray-700">
                                      {r.punctuality_breakdown.map((t, i) => (
                                        <li key={i}>
                                          ≥{t.minutesEarly} min early × ₹{t.amount}{' '}
                                          → {t.days} day(s) ={' '}
                                          <strong>{formatCurrency(t.total)}</strong>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-gray-500">
                                      No punctuality bonus (flexible-timing or no shift configured)
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
