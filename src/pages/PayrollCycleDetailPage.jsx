import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Eye, Gift, HandCoins, Pencil, Search, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pager, usePaged } from '@/components/ui/pager'
import { payrollService } from '@/services/payroll.service'
import EmployeePayrollView from '@/components/payroll/EmployeePayrollView'
import { formatCurrency } from '@/lib/utils'

const fmt = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-')
const STATUS = { draft: 'bg-secondary text-muted-foreground', calculated: 'bg-amber-100 text-amber-700', approved: 'bg-sky-100 text-sky-700', paid: 'bg-emerald-100 text-emerald-700' }

function Stat({ icon: Icon, tone, value, label }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-[18px] w-[18px]" /></div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-none">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

const errText = (e) => e?.response?.data?.error?.message || e?.message || 'Something went wrong'
const FIELDS = [
  ['present', 'Present days', 'present'],
  ['half_day', 'Half days', 'half_day'],
  ['leave', 'Leave days', 'leave'],
  ['penalty_hours', 'Penalty hours', 'penalty_hours'],
]

/** Edit one person's figures for this cycle. A blank box means "use the attendance figure". */
function EditDialog({ cycleId, employee, locked, onClose, onSaved }) {
  const orig = employee.attendance || { present: employee.present, half_day: employee.half_day, leave: employee.leave, penalty_hours: employee.penalty_hours }
  const [vals, setVals] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, String(employee[k] ?? 0)])))
  const [note, setNote] = useState(employee.note || '')
  // A box left at the attendance figure (or emptied) is saved as "no change" so it keeps following attendance.
  const num = (k) => { const s = vals[k].trim(); if (s === '') return null; const n = Number(s); return n === Number(orig[k]) ? null : n }
  const invalid = FIELDS.some(([k]) => { const s = vals[k].trim(); return s !== '' && (!Number.isFinite(Number(s)) || Number(s) < 0) })

  const save = useMutation({
    mutationFn: () => payrollService.saveEntry(cycleId, employee.employee_id, {
      present: num('present'), half_day: num('half_day'), leave: num('leave'), penalty_hours: num('penalty_hours'), note: note.trim() || null,
    }),
    onSuccess: () => { toast.success(`Saved ${employee.name}`); onSaved(); onClose() },
    onError: (e) => toast.error(errText(e)),
  })
  const reset = useMutation({
    mutationFn: () => payrollService.resetEntry(cycleId, employee.employee_id),
    onSuccess: () => { toast.success('Back to attendance figures'); onSaved(); onClose() },
    onError: (e) => toast.error(errText(e)),
  })

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Edit {employee.name}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!invalid && !locked) save.mutate() }}>
          <p className="text-xs text-muted-foreground">Change the numbers used for this pay cycle only. A figure that matches attendance keeps following attendance.</p>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`pe-${k}`}>{label}</Label>
                <Input id={`pe-${k}`} type="number" inputMode="decimal" min={0} step={k === 'penalty_hours' ? 0.25 : 0.5} value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
                <p className="text-[11px] text-muted-foreground">Attendance: {orig[k]}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-note">Reason (optional)</Label>
            <Input id="pe-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          </div>
          {locked && <p role="alert" className="text-sm text-destructive">This cycle is paid and can't be edited.</p>}
          <div className="flex gap-2">
            {employee.edited && <Button type="button" variant="outline" disabled={locked || reset.isPending} onClick={() => reset.mutate()}>Reset to attendance</Button>}
            <Button type="submit" className="flex-1" disabled={invalid || locked || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function PayrollCycleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const { data, isLoading, error } = useQuery({ queryKey: ['payroll-cycle', id], queryFn: () => payrollService.getCycle(id).then((r) => r.data) })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.employees || []).filter((e) => !q || e.name.toLowerCase().includes(q) || (e.employee_code || '').toLowerCase().includes(q))
  }, [data, search])
  const paged = usePaged(rows, 10)

  if (isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading cycle…</p>
  if (error || !data) return (
    <div className="space-y-3 py-16 text-center">
      <p role="alert" className="text-sm text-destructive">{error?.response?.data?.error?.message || 'Could not load this cycle.'}</p>
      <Button variant="outline" onClick={() => navigate('/payroll')}>Back to Payroll</Button>
    </div>
  )

  const { cycle: c, totals: t } = data
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to payroll" onClick={() => navigate('/payroll')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">{c.name}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS[c.status] || STATUS.draft}`}>{c.status}</span>
            </h1>
            <p className="text-sm text-gray-500">{fmt(c.period_start)} to {fmt(c.period_end)} · {c.days} days · {c.branch || 'All branches'}{c.pay_date ? ` · Pay date ${fmt(c.pay_date)}` : ''}</p>
            {c.notes && <p className="text-sm text-gray-500">{c.notes}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} tone="bg-sky-100 text-sky-600" value={t.employees} label="Employees" />
        <Stat icon={Wallet} tone="bg-purple-100 text-purple-600" value={formatCurrency(t.base_salary)} label="Monthly base salaries" />
        <Stat icon={Gift} tone="bg-emerald-100 text-emerald-600" value={formatCurrency(t.incentive + t.punctuality)} label="Incentives and rewards" />
        <Stat icon={HandCoins} tone="bg-amber-100 text-amber-600" value={formatCurrency(t.advance_deduction)} label={`Advances deducted (of ${formatCurrency(t.advance_outstanding)} due)`} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {rows.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No employees found.</p> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Employee', 'Base salary', 'Present', 'Half', 'Leave', 'Absent', 'Late', 'Hours', 'Penalty hrs', 'Incentive', 'Punctuality', 'Expenses', 'Late fine', 'Advances', ''].map((h, i) => <TableHead key={h} className={`whitespace-nowrap uppercase ${i > 0 ? 'text-right' : ''}`}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.pageItems.map((e) => (
                  <TableRow key={e.employee_id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-xs font-semibold">{e.name}{e.edited && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700" title={e.note || 'Edited for this cycle'}>Edited</span>}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">{e.employee_code ? `${e.employee_code} · ` : ''}{e.role}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{e.base_salary != null ? formatCurrency(e.base_salary) : '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.present}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.half_day}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.leave}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.absent}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.late}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.total_hours}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.penalty_hours || '-'}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{e.incentive_amount ? formatCurrency(e.incentive_amount) : '-'}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{e.punctuality_amount ? formatCurrency(e.punctuality_amount) : '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.expenses_due ? formatCurrency(e.expenses_due) : '-'}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">{e.late_amount ? formatCurrency(e.late_amount) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {e.advance_outstanding || e.advance_deduction ? (
                        <button type="button" className="text-right hover:underline" onClick={() => setViewing(e)} title="Choose what to deduct">
                          <span className="block">{formatCurrency(e.advance_outstanding)}</span>
                          {e.advance_deduction > 0 && <span className="block text-[11px] text-red-600">- {formatCurrency(e.advance_deduction)} now</span>}
                        </button>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" aria-label={`View ${e.name}`} onClick={() => setViewing(e)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Edit ${e.name}`} onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Pager {...paged} />
      {viewing && <EmployeePayrollView key={viewing.employee_id} cycleId={id} employeeId={viewing.employee_id} onClose={() => setViewing(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['payroll-cycle', id] })} />}
      {editing && <EditDialog key={editing.employee_id} cycleId={id} employee={editing} locked={c.status === 'paid'} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ['payroll-cycle', id] })} />}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Attendance is read live for this cycle's dates. Incentives are for the month the cycle ends in. Salary calculation is the next step.</p>
    </div>
  )
}
