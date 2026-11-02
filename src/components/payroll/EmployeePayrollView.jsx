import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KindBadge, hhmm, shiftLabel } from '@/components/reports/AttendanceDrawers'
import { payrollService } from '@/services/payroll.service'
import { formatCurrency } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const errText = (e) => e?.response?.data?.error?.message || e?.message || 'Something went wrong'
const day = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
const short = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

function Section({ title, hint, children }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Mini({ label, value, tone = '' }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className={`text-base font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

/** Choose which advances this cycle takes back from the employee, and how much of each. */
function Advances({ cycleId, employeeId, advances, locked, onSaved }) {
  const qc = useQueryClient()
  const [take, setTake] = useState({})
  useEffect(() => { setTake(Object.fromEntries(advances.map((a) => [a.expense_id, a.deduct > 0 ? String(a.deduct) : '']))) }, [advances])
  const amt = (a) => Math.max(0, Number(take[a.expense_id]) || 0)
  const over = advances.some((a) => amt(a) > a.outstanding + 0.001)
  const total = advances.reduce((n, a) => n + amt(a), 0)
  const save = useMutation({
    mutationFn: () => payrollService.saveAdvances(cycleId, employeeId, advances.filter((a) => amt(a) > 0).map((a) => ({ expense_id: a.expense_id, amount: amt(a) }))),
    onSuccess: () => { toast.success('Advance deductions saved'); qc.invalidateQueries({ queryKey: ['payroll-cycle', cycleId] }); onSaved() },
    onError: (e) => toast.error(errText(e)),
  })
  if (advances.length === 0) return <p className="text-sm text-muted-foreground">No advances to recover.</p>
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow>
            {['Given on', 'Note', 'Advance', 'Still to recover', 'Deduct now'].map((h, i) => <TableHead key={h} className={`whitespace-nowrap text-xs uppercase ${i >= 2 ? 'text-right' : ''}`}>{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {advances.map((a) => (
              <TableRow key={a.expense_id}>
                <TableCell className="whitespace-nowrap">{short(a.date)}</TableCell>
                <TableCell className="text-muted-foreground">{a.note || '-'}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(a.amount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(a.outstanding)}</TableCell>
                <TableCell className="w-36 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Input type="number" min={0} max={a.outstanding} step="1" disabled={locked} aria-label={`Deduct from the advance of ${short(a.date)}`}
                      className="h-8 w-24 text-right" value={take[a.expense_id] ?? ''} placeholder="0" onChange={(e) => setTake({ ...take, [a.expense_id]: e.target.value })} />
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={locked} onClick={() => setTake({ ...take, [a.expense_id]: String(a.outstanding) })}>All</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {over && <p role="alert" className="text-sm text-destructive">You can't deduct more than what is still left on an advance.</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">Deducting <b className="tabular-nums">{formatCurrency(total)}</b> from this salary</p>
        <Button size="sm" disabled={over || locked || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save deductions'}</Button>
      </div>
    </div>
  )
}

function Line({ label, value, sign, strong }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 text-sm ${strong ? 'border-t pt-2 font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={`tabular-nums ${sign === '-' ? 'text-red-600' : sign === '+' ? 'text-emerald-700' : ''}`}>{sign && !strong ? sign : ''} {formatCurrency(value)}</span>
    </div>
  )
}

/** How the amount to give is made up, from the figures shown in the list. */
function PaySummary({ row, cycleDays }) {
  return (
    <Section title="Amount to give" hint={`Base salary is spread over ${cycleDays} days. ${row.cut_days ? `${row.cut_days} day${row.cut_days === 1 ? '' : 's'} are cut` : 'No days are cut'} for absence.`}>
      <div className="rounded-lg border px-4 py-2">
        <Line label="Base salary" value={row.base_salary || 0} />
        <Line label="Absence cut" value={row.salary_cut} sign="-" />
        <Line label="Incentive" value={row.incentive_amount} sign="+" />
        <Line label="Punctuality reward" value={row.punctuality_amount} sign="+" />
        <Line label="Unpaid expenses owed" value={row.expenses_due} sign="+" />
        <Line label="Late fine" value={row.late_amount} sign="-" />
        <Line label="Advances deducted" value={row.advance_deduction} sign="-" />
        <Line label="Net to give" value={row.net_pay} strong />
      </div>
    </Section>
  )
}

export default function EmployeePayrollView({ row, cycleDays, cycleId, employeeId, onClose, onChanged }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['payroll-employee', cycleId, employeeId], queryFn: () => payrollService.getEmployee(cycleId, employeeId).then((r) => r.data) })
  const qc = useQueryClient()
  const inc = data?.incentive
  const rows = useMemo(() => data?.days || [], [data])
  const refresh = () => { qc.invalidateQueries({ queryKey: ['payroll-employee', cycleId, employeeId] }); onChanged?.() }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{data ? data.employee.name : 'Employee'}{data?.employee.code ? <span className="ml-2 text-sm font-normal text-muted-foreground">{data.employee.code}</span> : null}</DialogTitle>
          {data && <p className="text-xs text-muted-foreground">{data.cycle.name} · {short(data.cycle.period_start)} to {short(data.cycle.period_end)}</p>}
        </DialogHeader>

        {isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          : error ? <p role="alert" className="py-10 text-center text-sm text-destructive">{errText(error)}</p> : (
          <div className="space-y-6">
            {row && <PaySummary row={row} cycleDays={cycleDays} />}
            <Section title="Attendance, day by day" hint="Shift, and when the person actually came and went.">
              {rows.length === 0 ? <p className="text-sm text-muted-foreground">No attendance was recorded in this period.</p> : (
                <div className="max-h-72 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card"><TableRow>
                      {['Date', 'Status', 'Shift', 'In', 'Out', 'Hours', 'Penalty hrs', 'Late fine', 'Notes'].map((h, i) => <TableHead key={h} className={`whitespace-nowrap text-xs uppercase ${i >= 5 && i <= 7 ? 'text-right' : ''}`}>{h}</TableHead>)}
                    </TableRow></TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.attendance_id}>
                          <TableCell className="whitespace-nowrap">{day(r.date)}</TableCell>
                          <TableCell><KindBadge row={r} /></TableCell>
                          <TableCell className="whitespace-nowrap">{shiftLabel(r.shift || r.planned_shift) || '-'}</TableCell>
                          <TableCell className="tabular-nums">{hhmm(r.check_in) || '-'}</TableCell>
                          <TableCell className="tabular-nums">{hhmm(r.check_out) || '-'}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.hours || '-'}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.penalty_hours || '-'}</TableCell>
                          <TableCell className="text-right tabular-nums text-red-600">{r.late_amount ? formatCurrency(r.late_amount) : '-'}</TableCell>
                          <TableCell className="max-w-[16rem] truncate text-xs text-muted-foreground" title={r.notes || ''}>{r.notes || ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Section>

            <Section title="Incentives and punctuality reward" hint={inc ? `Worked out for ${MONTHS[inc.month - 1]} ${inc.year}, the month this cycle ends in.` : undefined}>
              {!inc ? <p className="text-sm text-muted-foreground">No incentive applies to this person.</p> : (
                <div className="space-y-3">
                  {inc.paid_out && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">This month's incentive was already paid out from the incentives screen, so it is not added again here.</p>}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Mini label="Incentive" value={formatCurrency(inc.incentive)} />
                    <Mini label="Punctuality reward" value={formatCurrency(inc.punctuality)} />
                    <Mini label="Services done" value={inc.service_count} />
                    <Mini label="Revenue credited" value={formatCurrency(inc.service_revenue)} />
                  </div>
                  {inc.punctuality_breakdown.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader><TableRow>{['Punctuality rule', 'Per day', 'Days', 'Total'].map((h, i) => <TableHead key={h} className={`text-xs uppercase ${i ? 'text-right' : ''}`}>{h}</TableHead>)}</TableRow></TableHeader>
                        <TableBody>
                          {inc.punctuality_breakdown.map((b, i) => (
                            <TableRow key={i}><TableCell>{b.label}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(b.amount)}</TableCell><TableCell className="text-right tabular-nums">{b.days}</TableCell><TableCell className="text-right tabular-nums font-medium">{formatCurrency(b.total)}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {inc.daily_breakdown.length > 0 && (
                    <div className="max-h-48 overflow-auto rounded-lg border">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card"><TableRow>{['Day', 'Earned', 'Stars', 'Daily incentive', 'Star incentive'].map((h, i) => <TableHead key={h} className={`whitespace-nowrap text-xs uppercase ${i ? 'text-right' : ''}`}>{h}</TableHead>)}</TableRow></TableHeader>
                        <TableBody>
                          {inc.daily_breakdown.filter((d) => d.daily_incentive || d.daily_star_incentive).map((d) => (
                            <TableRow key={d.date}><TableCell className="whitespace-nowrap">{day(d.date)}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(d.earnings)}</TableCell><TableCell className="text-right tabular-nums">{d.stars}</TableCell><TableCell className="text-right tabular-nums">{d.daily_incentive ? formatCurrency(d.daily_incentive) : '-'}</TableCell><TableCell className="text-right tabular-nums">{d.daily_star_incentive ? formatCurrency(d.daily_star_incentive) : '-'}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <Section title="Expenses owed to this person" hint="Unpaid expenses added with this employee. Mark them paid from Expenses once settled.">
              {data.expenses.length === 0 ? <p className="text-sm text-muted-foreground">Nothing owed.</p> : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow>{['Date', 'Category', 'Details', 'Amount'].map((h, i) => <TableHead key={h} className={`text-xs uppercase ${i === 3 ? 'text-right' : ''}`}>{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {data.expenses.map((x) => (
                        <TableRow key={x.id}><TableCell className="whitespace-nowrap">{short(x.date)}</TableCell><TableCell>{x.category}</TableCell><TableCell className="text-muted-foreground">{x.description || '-'}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(x.amount)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Section>

            <Section title="Advances" hint="Advances stay on record. Pick how much of each to take back from this salary.">
              <Advances cycleId={cycleId} employeeId={employeeId} advances={data.advances} locked={data.cycle.status === 'paid'} onSaved={refresh} />
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
