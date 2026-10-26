import { useCallback, useMemo, useRef, useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, Copy, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { shiftService } from '@/services/shift.service'
import { userService } from '@/services/user.service'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import {
  addDays, buildRange, clamp, fromDateStr, inRect, monthsOf, pasteCells, readMatrix, rect, toDateStr, weekStart,
} from '@/lib/roster'

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const employeeId = (u) => u.user_id || u.id

const HINTS = [
  [['←', '↑', '↓', '→'], 'move'],
  [['Shift', '+arrows'], 'select range'],
  [['1', '–', '9'], 'set shift'],
  [['Del'], 'clear'],
  [['f'], 'fill right'],
  [['d'], 'fill down'],
  [['Ctrl', 'C'], 'copy'],
  [['Ctrl', 'V'], 'paste'],
  [['PgUp', 'PgDn'], 'prev / next'],
  [['t'], 'today'],
]

/** Keyboard-first roster: employees as rows, days as columns, press a number to set a shift. */
export default function RosterGrid({ branchId }) {
  const queryClient = useQueryClient()
  const gridRef = useRef(null)
  const clipboard = useRef(null)
  const today = toDateStr(new Date())
  const [view, setView] = useState('week')
  const [anchor, setAnchor] = useState(weekStart(today))
  const [cursor, setCursor] = useState({ r: 0, c: 0 })
  const [sel, setSel] = useState({ r: 0, c: 0 }) // other corner of the selection
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [onlyScheduled, setOnlyScheduled] = useState(false)
  const [brush, setBrush] = useState(null) // shift id | 'clear' | null — click or drag cells to paint it
  const dragging = useRef(false)

  const dates = useMemo(() => buildRange(anchor, view), [anchor, view])
  const months = useMemo(() => monthsOf(dates), [dates])

  const { data: shiftsData } = useQuery({ queryKey: ['shifts'], queryFn: () => shiftService.getShifts() })
  const shifts = useMemo(
    () => (shiftsData?.data || []).filter((s) => s.is_active).sort((a, b) => a.start_time.localeCompare(b.start_time)).slice(0, 9),
    [shiftsData]
  )
  const shiftById = useMemo(() => new Map((shiftsData?.data || []).map((s) => [s.id, s])), [shiftsData])

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', { role: 'employee,manager,cashier', branch_id: branchId || undefined }],
    queryFn: () => userService.getUsers({ role: 'employee,manager,cashier', branch_id: branchId || undefined, limit: 500 }),
  })
  // Only staff with an employee profile can be scheduled (the API rejects managers/cashiers without one).
  const allEmployees = useMemo(() => (usersData?.data || []).filter((u) => u.employee_details), [usersData])

  const assignmentQueries = useQueries({
    queries: months.map((m) => ({
      queryKey: ['shift-assignments', m],
      queryFn: () => shiftService.getAssignments({ month: m }),
    })),
  })
  const assignments = useMemo(
    () => assignmentQueries.flatMap((q) => q.data?.data || []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignmentQueries.map((q) => q.dataUpdatedAt).join(',')]
  )
  const lookupMap = useMemo(() => new Map(assignments.map((a) => [`${a.employee_id}|${a.shift_date}`, a])), [assignments])
  const lookup = useCallback((emp, date) => lookupMap.get(`${emp}|${date}`), [lookupMap])
  const employees = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q ? allEmployees.filter((e) => e.full_name?.toLowerCase().includes(q)) : allEmployees
    if (onlyScheduled) list = list.filter((e) => dates.some((d) => lookupMap.has(`${employeeId(e)}|${d}`)))
    return list
  }, [allEmployees, search, onlyScheduled, dates, lookupMap])
  const rowIds = useMemo(() => employees.map(employeeId), [employees])

  const selection = rect(cursor, sel)
  const rows = rowIds.length
  const cols = dates.length

  const move = (dr, dc, extend) => {
    const next = { r: clamp(cursor.r + dr, 0, Math.max(rows - 1, 0)), c: clamp(cursor.c + dc, 0, cols - 1) }
    setCursor(next)
    if (!extend) setSel(next)
  }

  const shiftPeriod = useCallback((dir) => {
    if (view === 'month') {
      const d = fromDateStr(anchor)
      setAnchor(toDateStr(new Date(d.getFullYear(), d.getMonth() + dir, 1)))
    } else {
      setAnchor((a) => addDays(a, dir * 7))
    }
    setCursor((c) => ({ ...c, c: 0 }))
    setSel((c) => ({ ...c, c: 0 }))
  }, [view, anchor])

  const switchView = (next) => {
    setView(next)
    setAnchor(next === 'month' ? `${today.slice(0, 7)}-01` : weekStart(today))
    setCursor({ r: 0, c: 0 }); setSel({ r: 0, c: 0 })
  }

  // Write a list of { employeeId, date, shiftId|null } and refresh once.
  const apply = async (cells) => {
    const ops = cells.filter((cell) => (lookup(cell.employeeId, cell.date)?.shift_id ?? null) !== cell.shiftId)
    if (!ops.length) return
    setSaving(true)
    const results = await Promise.allSettled(
      ops.map((cell) => {
        const existing = lookup(cell.employeeId, cell.date)
        if (cell.shiftId) return shiftService.assignShift(cell.employeeId, cell.shiftId, cell.date)
        return existing ? shiftService.removeAssignment(existing.id) : Promise.resolve()
      })
    )
    await queryClient.invalidateQueries({ queryKey: ['shift-assignments'] })
    queryClient.invalidateQueries({ queryKey: ['attendance-monthly-self'] })
    setSaving(false)
    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length) {
      toast.error(failed[0].reason?.response?.data?.error?.message || `${failed.length} change(s) failed`)
    } else {
      toast.success(`${ops.length} day${ops.length > 1 ? 's' : ''} updated`)
    }
  }

  const selectedCells = (shiftId) => {
    const cells = []
    for (let r = selection.r0; r <= selection.r1; r++) {
      for (let c = selection.c0; c <= selection.c1; c++) cells.push({ employeeId: rowIds[r], date: dates[c], shiftId })
    }
    return cells
  }

  const brushRef = useRef(null)
  brushRef.current = brush
  const applyRef = useRef(null)
  const selRef = useRef(null)
  useEffect(() => {
    const up = () => {
      if (!dragging.current) return
      dragging.current = false
      const b = brushRef.current
      if (b) applyRef.current?.(selRef.current(b === 'clear' ? null : b))
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const onKeyDown = (e) => {
    if (!rows) return
    const k = e.key
    const mod = e.ctrlKey || e.metaKey
    let handled = true

    if (mod && k.toLowerCase() === 'c') {
      clipboard.current = readMatrix(selection, rowIds, dates, lookup)
      toast.message('Copied')
    } else if (mod && k.toLowerCase() === 'v') {
      if (clipboard.current) apply(pasteCells(clipboard.current, { r: selection.r0, c: selection.c0 }, rowIds, dates))
    } else if (mod || e.altKey) {
      handled = false
    } else if (k === 'ArrowLeft' || k === 'h') move(0, -1, e.shiftKey)
    else if (k === 'ArrowRight' || k === 'l') move(0, 1, e.shiftKey)
    else if (k === 'ArrowUp' || k === 'k') move(-1, 0, e.shiftKey)
    else if (k === 'ArrowDown' || k === 'j') move(1, 0, e.shiftKey)
    else if (k === 'Home') { const n = { r: cursor.r, c: 0 }; setCursor(n); if (!e.shiftKey) setSel(n) }
    else if (k === 'End') { const n = { r: cursor.r, c: cols - 1 }; setCursor(n); if (!e.shiftKey) setSel(n) }
    else if (k === 'PageDown') shiftPeriod(1)
    else if (k === 'PageUp') shiftPeriod(-1)
    else if (k === 't') {
      const idx = dates.indexOf(today)
      if (idx >= 0) { const n = { r: cursor.r, c: idx }; setCursor(n); setSel(n) } else { setAnchor(view === 'month' ? `${today.slice(0, 7)}-01` : weekStart(today)) }
    } else if (k === 'Escape') setSel(cursor)
    else if (/^[1-9]$/.test(k)) {
      const shift = shifts[Number(k) - 1]
      if (shift) apply(selectedCells(shift.id)); else toast.error(`No shift #${k}`)
    } else if (k === 'Delete' || k === 'Backspace' || k === '0') apply(selectedCells(null))
    else if (k === 'f') {
      const v = lookup(rowIds[cursor.r], dates[cursor.c])?.shift_id ?? null
      apply(dates.slice(cursor.c).map((date) => ({ employeeId: rowIds[cursor.r], date, shiftId: v })))
    } else if (k === 'd') {
      const v = lookup(rowIds[cursor.r], dates[cursor.c])?.shift_id ?? null
      apply(rowIds.map((id) => ({ employeeId: id, date: dates[cursor.c], shiftId: v })))
    } else handled = false

    if (handled) e.preventDefault()
  }

  applyRef.current = apply
  selRef.current = selectedCells

  const coverage = useMemo(
    () => dates.map((d) => rowIds.filter((id) => lookup(id, d)).length),
    [dates, rowIds, lookup]
  )
  const emptyCount = useMemo(
    () => rowIds.reduce((n, id) => n + dates.filter((d) => d >= today && !lookup(id, d)).length, 0),
    [rowIds, dates, lookup, today]
  )

  const title = view === 'month'
    ? fromDateStr(anchor).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : `${fromDateStr(dates[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${fromDateStr(dates[6]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const renderImage = () => {
    const week = view === 'week'
    const list = employees.filter((e) => dates.some((d) => lookup(employeeId(e), d)))
    const nRows = list.length
    const cw = week ? 130 : 66, rh = week ? 46 : 36, nameW = 190, top = 118, scale = 2
    const W = nameW + cw * cols + 24, H = top + rh * nRows + 24
    const cv = document.createElement('canvas')
    cv.width = W * scale; cv.height = H * scale
    const g = cv.getContext('2d')
    g.scale(scale, scale)
    const font = (w, px) => { g.font = `${w} ${px}px Inter, system-ui, sans-serif` }
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#111827'; font(700, 20); g.textBaseline = 'middle'
    g.fillText(`Shift schedule · ${title}`, 12, 24)
    let lx = 12
    font(500, 13)
    shifts.forEach((s) => {
      const label = `${s.name} ${s.start_time}–${s.end_time}`
      g.fillStyle = s.color_code; g.beginPath(); g.arc(lx + 6, 56, 6, 0, 7); g.fill()
      g.fillStyle = '#374151'; g.fillText(label, lx + 18, 56)
      lx += 18 + g.measureText(label).width + 20
    })
    const y0 = 80
    g.fillStyle = '#f3f4f6'; g.fillRect(0, y0, W, top - y0 + 0)
    g.fillStyle = '#6b7280'; font(600, 11); g.fillText('EMPLOYEE', 12, y0 + 19)
    dates.forEach((d, c) => {
      const dt = fromDateStr(d), x = nameW + c * cw
      g.fillStyle = dt.getDay() === 0 ? '#dc2626' : '#111827'; g.textAlign = 'center'
      font(600, 12); g.fillText(DAY[dt.getDay()], x + cw / 2, y0 + 12)
      font(400, 11); g.fillText(`${dt.getDate()} ${dt.toLocaleDateString('en-IN', { month: 'short' })}`, x + cw / 2, y0 + 28)
      g.textAlign = 'left'
    })
    g.strokeStyle = '#e5e7eb'
    list.forEach((emp, r) => {
      const id = employeeId(emp), y = top + r * rh
      g.fillStyle = '#111827'; font(500, 13); g.fillText(emp.full_name.slice(0, 22), 12, y + rh / 2)
      g.beginPath(); g.moveTo(0, y + rh); g.lineTo(W, y + rh); g.stroke()
      dates.forEach((d, c) => {
        const a = lookup(id, d), sh = a && shiftById.get(a.shift_id), x = nameW + c * cw
        if (!sh) return
        g.fillStyle = sh.color_code; g.beginPath(); g.roundRect(x + 3, y + 4, cw - 6, rh - 8, 5); g.fill()
        g.fillStyle = '#fff'; g.textAlign = 'center'
        if (week) { font(600, 12); g.fillText(sh.name, x + cw / 2, y + rh / 2 - 7); font(400, 10); g.fillText(`${sh.start_time}–${sh.end_time}`, x + cw / 2, y + rh / 2 + 8) }
        else { font(600, 10); g.fillText(sh.name.slice(0, 8), x + cw / 2, y + rh / 2) }
        g.textAlign = 'left'
      })
    })
    return cv
  }
  const exportImage = (mode) => {
    if (!rows) return
    if (!employees.some((e) => dates.some((d) => lookup(employeeId(e), d)))) { toast.error('No shifts assigned in this period'); return }
    renderImage().toBlob(async (blob) => {
      if (!blob) return
      if (mode === 'copy') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          toast.success('Image copied — paste it in WhatsApp / chat')
          return
        } catch { toast.message('Copy not supported here — downloading instead') }
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = `shift-schedule-${dates[0]}.png`; a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    })
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border bg-background">
          <Button variant="ghost" size="icon" aria-label="Previous" onClick={() => shiftPeriod(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[170px] px-2 text-center text-sm font-semibold">{title}</span>
          <Button variant="ghost" size="icon" aria-label="Next" onClick={() => shiftPeriod(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex rounded-md border bg-secondary p-0.5">
          {['week', 'month'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { switchView(v); gridRef.current?.focus({ preventScroll: true }) }}
              className={cn('rounded px-3 py-1 text-[13px] font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                view === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {v}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCursor({ r: 0, c: cursor.c }); setSel({ r: 0, c: cursor.c }) }}
          onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); gridRef.current?.focus({ preventScroll: true }) } }}
          placeholder="Find employee…  (/)"
          aria-label="Find employee"
          className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/15"
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
          <input type="checkbox" checked={onlyScheduled} onChange={(e) => setOnlyScheduled(e.target.checked)} /> Only scheduled staff
        </label>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {saving && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>}
          <Button variant="outline" size="sm" onClick={() => exportImage('copy')} disabled={!rows}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy image</Button>
          <Button variant="outline" size="sm" onClick={() => exportImage('save')} disabled={!rows}><Download className="mr-1.5 h-3.5 w-3.5" /> Save image</Button>
        </div>
      </div>

      {/* Brush: pick a shift, then click or drag over days to assign it */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Shift keys">
        <span className="text-xs font-medium text-muted-foreground">Pick a shift, then click or drag on the days:</span>
        {shifts.length === 0 && <p className="text-sm text-muted-foreground">Create a shift in the “Shifts” tab first.</p>}
        {shifts.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setBrush(brush === s.id ? null : s.id); gridRef.current?.focus({ preventScroll: true }) }}
            className={cn('inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[13px] outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50',
              brush === s.id && 'ring-2 ring-primary')}
          >
            <Kbd>{i + 1}</Kbd>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color_code }} />
            <span className="font-medium">{s.name}</span>
            <span className="text-xs text-muted-foreground">{s.start_time}–{s.end_time}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setBrush(brush === 'clear' ? null : 'clear'); gridRef.current?.focus({ preventScroll: true }) }}
          className={cn('inline-flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1 text-[13px] text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50',
            brush === 'clear' && 'ring-2 ring-primary')}
        >
          <Kbd>Del</Kbd> Clear
        </button>
        {brush && <button type="button" onClick={() => setBrush(null)} className="text-xs text-primary underline">Stop painting</button>}
      </div>

      {emptyCount > 0 && (
        <p className="rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-foreground">
          {emptyCount} upcoming day{emptyCount > 1 ? 's have' : ' has'} no shift in this view. Without a shift, no late penalty is calculated for that day.
        </p>
      )}

      {/* Grid */}
      <div className="max-h-[calc(100vh-300px)] min-h-[280px] overflow-auto rounded-xl border bg-card">
        {usersLoading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !rows ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No employees to schedule.</p>
        ) : (
          <div
            ref={gridRef}
            role="grid"
            tabIndex={0}
            aria-label="Shift roster. Arrow keys move, number keys set a shift, Delete clears."
            onKeyDown={onKeyDown}
            style={{ minWidth: 150 + cols * 84 }}
            className="select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <div role="row" className="sticky top-0 z-10 flex border-b bg-secondary/80 backdrop-blur">
              <div className="sticky left-0 z-20 w-40 shrink-0 bg-secondary px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Employee</div>
              {dates.map((d, c) => {
                const dt = fromDateStr(d)
                const weekend = dt.getDay() === 0
                return (
                  <div key={d} role="columnheader" onMouseDown={() => { setCursor({ r: 0, c }); setSel({ r: rows - 1, c }); gridRef.current?.focus({ preventScroll: true }) }} className={cn('min-w-[84px] flex-1 cursor-pointer px-1 py-1.5 text-center text-xs', d === today && 'text-primary font-semibold', weekend && 'text-destructive', c === cursor.c && 'bg-accent')}>
                    <div className="font-medium">{DAY[dt.getDay()]}</div>
                    <div className="text-[11px] opacity-80">{dt.getDate()} {dt.toLocaleDateString('en-IN', { month: 'short' })}</div>
                  </div>
                )
              })}
            </div>

            {employees.map((emp, r) => {
              const id = employeeId(emp)
              return (
                <div key={id} role="row" className="flex border-b last:border-b-0">
                  <div
                    onMouseDown={() => { setCursor({ r, c: 0 }); setSel({ r, c: cols - 1 }); gridRef.current?.focus({ preventScroll: true }) }}
                    className={cn('sticky left-0 z-10 w-40 shrink-0 cursor-pointer truncate bg-card px-3 py-1.5 text-[13px] leading-tight', r === cursor.r && 'bg-accent font-medium')}
                  >
                    {emp.full_name}
                    <span className="block text-[10px] text-muted-foreground">{emp.employee_details?.employee_code || emp.role}</span>
                  </div>
                  {dates.map((d, c) => {
                    const a = lookup(id, d)
                    const shift = a ? shiftById.get(a.shift_id) : null
                    const selected = inRect(selection, r, c)
                    const isCursor = r === cursor.r && c === cursor.c
                    return (
                      <div
                        key={d}
                        role="gridcell"
                        aria-selected={selected}
                        onMouseDown={(e) => {
                          const n = { r, c }
                          if (e.shiftKey) setSel(n)
                          else { setCursor(n); setSel(n) }
                          dragging.current = true
                          gridRef.current?.focus({ preventScroll: true })
                        }}
                        onMouseEnter={(e) => { if (dragging.current && e.buttons === 1) setSel({ r, c }) }}
                        className={cn(
                          'grid h-8 min-w-[84px] flex-1 cursor-pointer select-none place-items-center border-l px-1 text-center',
                          selected && 'bg-primary/10',
                          isCursor && 'outline outline-2 -outline-offset-2 outline-primary'
                        )}
                      >
                        {shift ? (
                          <div className="w-full truncate rounded px-1.5 py-1 text-[11px] font-medium leading-none text-white" style={{ backgroundColor: shift.color_code }} title={`${shift.name} ${shift.start_time}–${shift.end_time}`}>
                            {shift.name}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">{d >= today ? '—' : ''}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            <div role="row" className="flex border-t bg-secondary/50 text-[11px] text-muted-foreground">
              <div className="sticky left-0 z-10 w-40 shrink-0 bg-secondary px-3 py-1">Scheduled</div>
              {coverage.map((n, c) => (
                <div key={dates[c]} className={cn('min-w-[84px] flex-1 py-1 text-center', n < rows && dates[c] >= today && 'text-warning font-medium')}>
                  {n}/{rows}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key hints */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {HINTS.map(([keys, label]) => (
          <span key={label} className="inline-flex items-center gap-1">
            {keys.map((k) => <Kbd key={k}>{k}</Kbd>)} {label}
          </span>
        ))}
      </div>
    </div>
  )
}
