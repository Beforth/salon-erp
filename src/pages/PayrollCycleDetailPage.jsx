import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CheckCircle2, IndianRupee, Search, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pager, usePaged } from '@/components/ui/pager'
import { payrollService } from '@/services/payroll.service'
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

export default function PayrollCycleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
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
        <Stat icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" value={t.present} label="Present days" />
        <Stat icon={Wallet} tone="bg-purple-100 text-purple-600" value={formatCurrency(t.base_salary)} label="Monthly base salaries" />
        <Stat icon={IndianRupee} tone="bg-red-100 text-red-600" value={formatCurrency(t.late_amount)} label="Late fines" />
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
                  {['Employee', 'Base salary', 'Present', 'Half', 'Leave', 'Absent', 'Late', 'Hours', 'Penalty hrs', 'Late fine'].map((h, i) => <TableHead key={h} className={`whitespace-nowrap uppercase ${i > 0 ? 'text-right' : ''}`}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.pageItems.map((e) => (
                  <TableRow key={e.employee_id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-xs font-semibold">{e.name}</p>
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
                    <TableCell className="text-right tabular-nums text-red-600">{e.late_amount ? formatCurrency(e.late_amount) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Pager {...paged} />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Attendance is read live for this cycle's dates. Salary calculation is the next step.</p>
    </div>
  )
}
