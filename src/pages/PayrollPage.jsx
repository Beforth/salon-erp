import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { payrollService } from '@/services/payroll.service'
import { branchService } from '@/services/branch.service'
import { Empty } from '@/components/reports/ReportKit'
import { istTodayStr } from '@/components/reports/reportRange'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** First and last day of a YYYY-MM month, as YYYY-MM-DD. */
function monthBounds(ym) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, '0')}`, label: `${MONTHS[m - 1]} ${y}` }
}

const fmt = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—')
const errText = (e) => e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Something went wrong'

const STATUS_TONE = { draft: 'bg-amber-100 text-amber-800' }

function CycleForm({ branches, onCreated }) {
  const today = istTodayStr()
  const [mode, setMode] = useState('month')
  const [month, setMonth] = useState(today.slice(0, 7))
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [name, setName] = useState('')
  const [payDate, setPayDate] = useState('')
  const [branchId, setBranchId] = useState('')
  const [notes, setNotes] = useState('')

  const bounds = useMemo(() => (mode === 'month' && /^\d{4}-\d{2}$/.test(month) ? monthBounds(month) : null), [mode, month])
  const start = mode === 'month' ? bounds?.start : from
  const end = mode === 'month' ? bounds?.end : to
  const suggested = mode === 'month' ? bounds?.label || '' : ''

  const create = useMutation({
    mutationFn: () => payrollService.createCycle({
      name: (name.trim() || suggested).trim(),
      period_start: start,
      period_end: end,
      pay_date: payDate || null,
      branch_id: branchId || null,
      notes: notes.trim() || null,
    }),
    onSuccess: (res) => {
      toast.success(`Payroll cycle "${res.data.name}" created`)
      setName(''); setNotes(''); setPayDate('')
      onCreated()
    },
    onError: (e) => toast.error(errText(e)),
  })

  const finalName = (name.trim() || suggested).trim()
  const bad = !start || !end || end < start
  const canSave = Boolean(finalName) && !bad

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><CalendarPlus className="h-4 w-4" /> New payroll cycle</CardTitle>
        <CardDescription>A cycle is a pay period. Pick the dates and who it covers; salaries are calculated against it later.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="inline-flex rounded-md border bg-muted/50 p-0.5" role="radiogroup" aria-label="Period type">
          {[['month', 'Calendar month'], ['custom', 'Custom dates']].map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === k ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mode === 'month' ? (
            <div className="space-y-1.5">
              <Label htmlFor="pc-month">Month</Label>
              <Input id="pc-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
              {bounds && <p className="text-xs text-muted-foreground">{fmt(bounds.start)} to {fmt(bounds.end)}</p>}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="pc-from">Period starts</Label>
                <Input id="pc-from" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-to">Period ends</Label>
                <Input id="pc-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pc-name">Name</Label>
            <Input id="pc-name" value={name} maxLength={100} placeholder={suggested || 'e.g. Diwali bonus cycle'} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pc-pay">Pay date (optional)</Label>
            <Input id="pc-pay" type="date" value={payDate} min={start || undefined} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pc-branch">Covers</Label>
            <SelectField id="pc-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
            </SelectField>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pc-notes">Notes (optional)</Label>
            <Input id="pc-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {bad && start && end && <p role="alert" className="text-sm text-destructive">The period must end on or after its start.</p>}
        <div className="flex justify-end">
          <Button onClick={() => create.mutate()} disabled={!canSave || create.isPending}>{create.isPending ? 'Creating…' : 'Create cycle'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PayrollPage() {
  const qc = useQueryClient()
  const { data: cyclesData, isLoading, error } = useQuery({ queryKey: ['payroll-cycles'], queryFn: () => payrollService.listCycles().then((r) => r.data || []) })
  const { data: branchData } = useQuery({ queryKey: ['branches', 'payroll'], queryFn: () => branchService.getBranches({ is_active: 'true' }) })
  const branches = (branchData?.data || []).filter((b) => b.is_salon !== false)
  const cycles = cyclesData || []

  const remove = useMutation({
    mutationFn: (id) => payrollService.deleteCycle(id),
    onSuccess: () => { toast.success('Cycle deleted'); qc.invalidateQueries({ queryKey: ['payroll-cycles'] }) },
    onError: (e) => toast.error(errText(e)),
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <p className="text-sm text-gray-500">Set up pay periods. Only the owner can see this page.</p>
      </div>

      <Tabs defaultValue="cycles">
        <TabsList>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
        </TabsList>
        <TabsContent value="cycles" className="space-y-5">
          <CycleForm branches={branches} onCreated={() => qc.invalidateQueries({ queryKey: ['payroll-cycles'] })} />

          <Card>
            <CardHeader><CardTitle className="text-base">Payroll cycles</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
                : error ? <p role="alert" className="py-8 text-center text-sm text-destructive">Could not load the cycles. {errText(error)}</p>
                : cycles.length === 0 ? <Empty>No payroll cycles yet. Create the first one above.</Empty> : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Cycle</th><th className="px-3 py-2">Period</th><th className="px-3 py-2">Covers</th>
                          <th className="px-3 py-2 text-right">Staff</th><th className="px-3 py-2">Pay date</th><th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cycles.map((c) => (
                          <tr key={c.id} className="border-t">
                            <td className="px-3 py-2 font-medium">{c.name}{c.notes && <p className="text-xs font-normal text-muted-foreground">{c.notes}</p>}</td>
                            <td className="whitespace-nowrap px-3 py-2">{fmt(c.period_start)} to {fmt(c.period_end)} <span className="text-xs text-muted-foreground">({c.days} days)</span></td>
                            <td className="px-3 py-2">{c.branch || 'All branches'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.staff_count}</td>
                            <td className="whitespace-nowrap px-3 py-2">{fmt(c.pay_date)}</td>
                            <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_TONE[c.status] || 'bg-muted'}`}>{c.status}</span></td>
                            <td className="px-3 py-2 text-right">
                              {c.status === 'draft' && (
                                <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} disabled={remove.isPending}
                                  onClick={() => { if (window.confirm(`Delete the cycle "${c.name}"?`)) remove.mutate(c.id) }}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
