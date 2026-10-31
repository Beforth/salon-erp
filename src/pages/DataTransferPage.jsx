import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, ShieldCheck, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { branchService } from '@/services/branch.service'
import { dataTransferService, errorMessage, saveBlob } from '@/services/dataTransfer.service'
import { cn } from '@/lib/utils'

const HINTS = {
  customers: 'People who visit. Matched by phone number.',
  services: 'Your service menu with prices. Matched by name and category.',
  products: 'Retail and in-use products. Matched by barcode, SKU, then name.',
  staff: 'Employees, managers and cashiers. New staff get a generated password.',
  expenses: 'Money spent. Pick a date range to export.',
  punches: 'Attendance punches (in / out). Shifts and late rules apply as usual.',
  bills: 'Past bills, one row per item, paid in full by one payment mode. Saved as history: stock, tokens and sale incentives are not touched. Tax, item discounts and split payments are not carried over.',
}
const HAS_DUPLICATES = new Set(['customers', 'services', 'products', 'staff'])
const todayIso = () => new Date().toISOString().slice(0, 10)
const monthStartIso = () => `${todayIso().slice(0, 8)}01`

const ACTION_STYLE = {
  create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  update: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  skip: 'bg-muted text-muted-foreground',
  error: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-xl font-semibold tabular-nums', tone)}>{value}</div>
    </div>
  )
}

export default function DataTransferPage() {
  const { user } = useSelector((s) => s.auth)
  const isOwner = ['owner', 'developer'].includes(user?.role)
  const [entityKey, setEntityKey] = useState('customers')
  const [format, setFormat] = useState('xlsx')
  const [from, setFrom] = useState(monthStartIso())
  const [to, setTo] = useState(todayIso())
  const [branchId, setBranchId] = useState('')
  const [file, setFile] = useState(null)
  const [onDuplicate, setOnDuplicate] = useState('skip')
  const [busy, setBusy] = useState('')
  const [report, setReport] = useState(null)
  const [committed, setCommitted] = useState(null)
  const inputRef = useRef(null)

  const { data: entitiesData } = useQuery({ queryKey: ['data-transfer-entities'], queryFn: dataTransferService.getEntities, enabled: isOwner })
  const { data: branchesData } = useQuery({ queryKey: ['branches', 'active'], queryFn: () => branchService.getBranches({ is_active: 'true' }), enabled: isOwner })
  const entities = entitiesData?.data || []
  const branches = branchesData?.data || []
  const entity = useMemo(() => entities.find((e) => e.key === entityKey), [entities, entityKey])

  const pick = (key) => {
    setEntityKey(key)
    setFile(null)
    setReport(null)
    setCommitted(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const onFile = (f) => {
    setFile(f || null)
    setReport(null)
    setCommitted(null)
  }

  const run = async (name, fn) => {
    setBusy(name)
    try { await fn() } catch (err) { toast.error(await errorMessage(err)) } finally { setBusy('') }
  }

  const doTemplate = () => run('template', async () => {
    const blob = await dataTransferService.template(entityKey, format)
    saveBlob(blob, `${entityKey}_template.${format}`)
  })

  const doExport = () => run('export', async () => {
    const params = { format, ...(entity?.needs_range ? { from, to, branch_id: branchId } : {}) }
    const blob = await dataTransferService.exportFile(entityKey, params)
    saveBlob(blob, `${entityKey}${entity?.needs_range ? `_${from}_to_${to}` : `_${todayIso()}`}.${format}`)
    toast.success('Export downloaded')
  })

  const doCheck = () => run('check', async () => {
    const res = await dataTransferService.importFile(entityKey, file, { dryRun: true, onDuplicate: HAS_DUPLICATES.has(entityKey) ? onDuplicate : undefined })
    setReport(res.data)
    setCommitted(null)
  })

  const doImport = () => run('import', async () => {
    const res = await dataTransferService.importFile(entityKey, file, { dryRun: false, onDuplicate: HAS_DUPLICATES.has(entityKey) ? onDuplicate : undefined })
    if (res.data.partial) {
      setCommitted(res.data)
      setReport(null)
      toast.error(`Stopped at row ${res.data.failed_row}`)
    } else if (res.data.committed) {
      setCommitted(res.data)
      setReport(null)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      toast.success('Import finished')
    } else {
      setReport(res.data)
      toast.error('Some rows still have errors — nothing was saved')
    }
  })

  const downloadLogins = () => {
    const rows = committed?.extra?.credentials || []
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = ['Name,Username,Password,Role', ...rows.map((r) => [r.full_name, r.username, r.password, r.role].map(esc).join(','))].join('\r\n')
    saveBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' }), 'new-staff-logins.csv')
  }

  if (!isOwner) return <div className="py-16 text-center text-muted-foreground">Only the owner can import and export data.</div>

  const s = report?.summary
  const canImport = report && report.summary.error === 0 && report.summary.create + report.summary.update > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Import / Export</h1>
        <p className="text-muted-foreground">Download your data as Excel or CSV, or bring data in from a file. Every import is checked first — nothing is saved until you confirm.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Data type" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {entities.map((e) => (
            <button
              key={e.key}
              type="button"
              aria-pressed={e.key === entityKey}
              onClick={() => pick(e.key)}
              className={cn(
                'shrink-0 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                e.key === entityKey ? 'border-primary bg-primary/5' : 'bg-card hover:bg-accent'
              )}
            >
              <div className="text-sm font-semibold">{e.label}</div>
              <div className="hidden text-xs text-muted-foreground lg:block">{HINTS[e.key]}</div>
            </button>
          ))}
        </nav>

        {entity && (
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4" />Export {entity.label.toLowerCase()}</CardTitle>
                <CardDescription>{HINTS[entity.key]}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">File type</Label>
                  <SelectField className="h-9 w-40 text-sm" value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                  </SelectField>
                </div>
                {entity.needs_range && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">From</Label>
                      <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To</Label>
                      <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Branch</Label>
                      <SelectField className="h-9 w-56 text-sm" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                        <option value="">All branches</option>
                        {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
                      </SelectField>
                    </div>
                  </>
                )}
                <Button onClick={doExport} disabled={!!busy}>
                  {busy === 'export' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export
                </Button>
              </CardContent>
            </Card>

            {entity.importable && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" />Import {entity.label.toLowerCase()}</CardTitle>
                  <CardDescription>
                    Fill the template, choose it below, check it, then import. An exported file works as a template too.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={doTemplate} disabled={!!busy}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />Download template ({format === 'xlsx' ? 'Excel' : 'CSV'})
                    </Button>
                    <span className="text-xs text-muted-foreground">Required columns: {entity.columns.filter((c) => c.required).map((c) => c.label).join(', ')}</span>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="dt-file" className="text-xs">File (.xlsx or .csv, up to 5 MB)</Label>
                      <input
                        id="dt-file"
                        ref={inputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => onFile(e.target.files?.[0])}
                        className="block h-9 w-72 max-w-full cursor-pointer rounded-md border border-input bg-background text-sm file:mr-3 file:h-full file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    {HAS_DUPLICATES.has(entity.key) && (
                      <div className="space-y-1">
                        <Label className="text-xs">If it already exists</Label>
                        <SelectField className="h-9 w-56 text-sm" value={onDuplicate} onChange={(e) => { setOnDuplicate(e.target.value); setReport(null) }}>
                          <option value="skip">Skip it (keep what I have)</option>
                          <option value="update">Update it from the file</option>
                        </SelectField>
                      </div>
                    )}
                    <Button onClick={doCheck} disabled={!file || !!busy} variant="secondary">
                      {busy === 'check' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Check file
                    </Button>
                  </div>

                  {report && (
                    <div className="space-y-3" aria-live="polite">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <Stat label="Rows" value={s.total} />
                        <Stat label="Will add" value={s.create} tone="text-emerald-600" />
                        <Stat label="Will update" value={s.update} tone="text-sky-600" />
                        <Stat label="Skipped" value={s.skip} />
                        <Stat label="Errors" value={s.error} tone={s.error ? 'text-rose-600' : ''} />
                      </div>

                      {report.unknown_columns?.length > 0 && (
                        <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Ignored columns not in the template: {report.unknown_columns.join(', ')}
                        </p>
                      )}

                      {report.problems?.length > 0 && (
                        <div className="rounded-lg border border-rose-200 dark:border-rose-900">
                          <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">Fix these in your file, then check again</div>
                          <ul className="max-h-60 divide-y overflow-auto text-sm">
                            {report.problems.map((p, i) => (
                              <li key={i} className="flex gap-3 px-3 py-1.5"><span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">Row {p.row}</span><span>{p.message}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {report.preview?.length > 0 && (
                        <div className="overflow-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2 text-left">Row</th><th className="px-3 py-2 text-left">What happens</th><th className="px-3 py-2 text-left">Record</th><th className="px-3 py-2 text-left">Note</th></tr></thead>
                            <tbody>
                              {report.preview.map((p) => (
                                <tr key={p.row} className="border-t">
                                  <td className="px-3 py-1.5 font-mono text-xs">{p.row}</td>
                                  <td className="px-3 py-1.5"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ACTION_STYLE[p.action])}>{p.action}</span></td>
                                  <td className="px-3 py-1.5">{p.label}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground">{p.message}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {s.total > report.preview.length && <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">Showing the first {report.preview.length} of {s.total} rows.</div>}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={doImport} disabled={!canImport || !!busy}>
                          {busy === 'import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Import {s.create + s.update} row{s.create + s.update === 1 ? '' : 's'}
                        </Button>
                        {s.error > 0 && <span className="text-sm text-rose-600">Nothing can be imported until every error is fixed.</span>}
                        {s.error === 0 && s.create + s.update === 0 && <span className="text-sm text-muted-foreground">Nothing new to import.</span>}
                      </div>
                    </div>
                  )}

                  {committed?.partial && (
                    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40" role="alert">
                      <p className="flex items-start gap-2 font-medium text-amber-900 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Stopped at row {committed.failed_row}: {committed.failure}</p>
                      <p className="text-amber-900 dark:text-amber-200">{committed.done.created + committed.done.updated} row(s) before it were saved. Fix the file and import it again — rows that already exist are skipped, so nothing is added twice.</p>
                      {committed.extra?.credentials?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-amber-900 dark:text-amber-200">Logins were already created for {committed.extra.credentials.length} new staff. <strong>This is the only time their passwords are shown.</strong></p>
                          <Button size="sm" onClick={downloadLogins}><Download className="mr-2 h-4 w-4" />Download logins (CSV)</Button>
                        </div>
                      )}
                    </div>
                  )}

                  {committed && !committed.partial && (
                    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40" role="status">
                      <p className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" />Imported: {committed.done.created} added, {committed.done.updated} updated, {committed.done.skipped} skipped.</p>
                      {committed.batch_id && <p className="text-xs text-muted-foreground">Bills from this import are tagged with batch ID <span className="font-mono">{committed.batch_id}</span>. There is no undo button — keep this ID if the batch ever has to be removed.</p>}
                      {committed.extra?.credentials?.length > 0 && (
                        <div className="space-y-2 text-sm">
                          <p className="text-amber-800 dark:text-amber-300">New staff logins were generated. <strong>This is the only time the passwords are shown</strong> — download them now and hand them out.</p>
                          <Button size="sm" onClick={downloadLogins}><Download className="mr-2 h-4 w-4" />Download logins (CSV)</Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
