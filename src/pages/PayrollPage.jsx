import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle2, Clock, Eye, FileText, Inbox, Plus, Search, Trash2, XCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pager, usePaged } from '@/components/ui/pager'
import { payrollService } from '@/services/payroll.service'
import { branchService } from '@/services/branch.service'
import { istTodayStr } from '@/components/reports/reportRange'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const STATUS = {
  draft: { label: 'Draft', cls: 'bg-secondary text-muted-foreground' },
  calculated: { label: 'Calculated', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', cls: 'bg-sky-100 text-sky-700' },
  paid: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
}
const STATUS_OPTIONS = [['all', 'All Status'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])]

function monthBounds(ym) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, '0')}`, label: `${MONTHS[m - 1]} ${y}` }
}
const fmt = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-')
const errText = (e) => e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Something went wrong'

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

function GenerateDialog({ open, onClose, branches, onCreated }) {
  const today = istTodayStr()
  const [mode, setMode] = useState('month')
  const [month, setMonth] = useState(today.slice(0, 7))
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [name, setName] = useState('')
  const [payDate, setPayDate] = useState('')
  const [branchId, setBranchId] = useState('')
  const [notes, setNotes] = useState('')

  const bounds = useMemo(() => (/^\d{4}-\d{2}$/.test(month) ? monthBounds(month) : null), [month])
  const start = mode === 'month' ? bounds?.start : from
  const end = mode === 'month' ? bounds?.end : to
  const suggested = mode === 'month' ? bounds?.label || '' : ''
  const finalName = (name.trim() || suggested).trim()
  const bad = !start || !end || end < start

  const create = useMutation({
    mutationFn: () => payrollService.createCycle({ name: finalName, period_start: start, period_end: end, pay_date: payDate || null, branch_id: branchId || null, notes: notes.trim() || null }),
    onSuccess: (res) => { toast.success(`Pay cycle "${res.data.name}" created`); setName(''); setNotes(''); setPayDate(''); onCreated(); onClose() },
    onError: (e) => toast.error(errText(e)),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Generate Payroll Cycle</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (finalName && !bad) create.mutate() }}>
          <div className="inline-flex rounded-md border bg-muted/50 p-0.5" role="radiogroup" aria-label="Period type">
            {[['month', 'Month'], ['custom', 'Custom dates']].map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === k ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
            ))}
          </div>
          {mode === 'month' ? (
            <div className="space-y-1.5">
              <Label htmlFor="pc-month">Pay Period</Label>
              <Input id="pc-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
              {bounds && <p className="text-xs text-muted-foreground">{fmt(bounds.start)} to {fmt(bounds.end)}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="pc-from">Starts</Label><Input id="pc-from" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="pc-to">Ends</Label><Input id="pc-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pc-name">Name</Label>
            <Input id="pc-name" value={name} maxLength={100} placeholder={suggested || 'e.g. Diwali bonus cycle'} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc-branch">Covers</Label>
              <SelectField id="pc-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-10 w-full">
                <option value="">All branches</option>
                {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5"><Label htmlFor="pc-pay">Pay date</Label><Input id="pc-pay" type="date" value={payDate} min={start || undefined} onChange={(e) => setPayDate(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="pc-notes">Notes (optional)</Label><Input id="pc-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} /></div>
          {bad && start && end && <p role="alert" className="text-sm text-destructive">The period must end on or after its start.</p>}
          <p className="text-[11px] text-muted-foreground">Creates a draft cycle. Salary calculation from attendance comes in the next step.</p>
          <Button type="submit" className="w-full" disabled={!finalName || bad || create.isPending}>
            <Zap className="mr-1.5 h-4 w-4" />{create.isPending ? 'Generating…' : 'Generate Cycle'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function PayrollPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const { data, isLoading, error } = useQuery({ queryKey: ['payroll-cycles'], queryFn: () => payrollService.listCycles().then((r) => r.data || []) })
  const { data: branchData } = useQuery({ queryKey: ['branches', 'payroll'], queryFn: () => branchService.getBranches({ is_active: 'true' }) })
  const branches = (branchData?.data || []).filter((b) => b.is_salon !== false)
  const cycles = data || []

  const remove = useMutation({
    mutationFn: (id) => payrollService.deleteCycle(id),
    onSuccess: () => { toast.success('Cycle deleted'); qc.invalidateQueries({ queryKey: ['payroll-cycles'] }) },
    onError: (e) => toast.error(errText(e)),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cycles
      .filter((c) => (status === 'all' || c.status === status) && (!q || c.name.toLowerCase().includes(q) || (c.branch || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.period_start < b.period_start ? 1 : -1))
  }, [cycles, search, status])
  const paged = usePaged(filtered, 8)
  const hasFilters = search || status !== 'all'
  const inProgress = cycles.filter((c) => c.status !== 'paid').length
  const paid = cycles.filter((c) => c.status === 'paid').length
  const latest = [...cycles].sort((a, b) => (a.period_end < b.period_end ? 1 : -1))[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500">Pay cycles and payouts</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Generate Cycle</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={FileText} tone="bg-sky-100 text-sky-600" value={cycles.length} label="Total Pay Cycles" />
        <Stat icon={Clock} tone="bg-amber-100 text-amber-600" value={inProgress} label="In Progress" />
        <Stat icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" value={paid} label="Paid" />
        <Stat icon={CalendarDays} tone="bg-purple-100 text-purple-600" value={latest ? latest.name : '-'} label="Latest Period" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or branch..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-[160px]">
          <SelectField value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full">
            {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </SelectField>
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatus('all') }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <XCircle className="h-3 w-3" />Clear
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">Loading payroll…</p>
          : error ? <p role="alert" className="py-12 text-center text-sm text-destructive">Could not load the cycles. {errText(error)}</p>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-14 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/50" />
              <p className="font-medium">{cycles.length === 0 ? 'No pay cycles yet' : 'No results found'}</p>
              <p className="text-sm text-muted-foreground">{cycles.length === 0 ? 'Click "Generate Cycle" to create a payroll period.' : 'Try adjusting your search or filters'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {['Period', 'Covers', 'Employees', 'Pay Date', 'Status', 'Actions'].map((h) => <TableHead key={h} className="whitespace-nowrap uppercase">{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.pageItems.map((c) => {
                    const s = STATUS[c.status] || STATUS.draft
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/payroll/cycle/${c.id}`)}>
                        <TableCell className="whitespace-nowrap">
                          <p className="text-xs font-semibold">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{fmt(c.period_start)} to {fmt(c.period_end)} · {c.days} days</p>
                          {c.notes && <p className="text-[11px] text-muted-foreground">{c.notes}</p>}
                        </TableCell>
                        <TableCell>{c.branch || 'All branches'}</TableCell>
                        <TableCell>
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-[11px] font-semibold">{c.staff_count}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{fmt(c.pay_date)}</TableCell>
                        <TableCell><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" aria-label={`Open ${c.name}`} onClick={() => navigate(`/payroll/cycle/${c.id}`)}><Eye className="h-4 w-4" /></Button>
                          {c.status === 'draft' && (
                            <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} disabled={remove.isPending}
                              onClick={() => { if (window.confirm(`Delete the cycle "${c.name}"?`)) remove.mutate(c.id) }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
      </div>
      <Pager {...paged} />

      <GenerateDialog open={open} onClose={() => setOpen(false)} branches={branches} onCreated={() => qc.invalidateQueries({ queryKey: ['payroll-cycles'] })} />
    </div>
  )
}
