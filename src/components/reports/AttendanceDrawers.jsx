import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { attendanceService } from '@/services/attendance.service'
import { reportsService } from '@/services/reports.service'
import { Empty } from './ReportKit'

export const KIND_LABEL = { present: 'Present', half_day: 'Half day', leave: 'On leave', absent: 'Absent', unmarked: 'Not marked' }
export const KIND_TONE = {
  present: 'bg-emerald-100 text-emerald-800',
  half_day: 'bg-amber-100 text-amber-800',
  leave: 'bg-sky-100 text-sky-800',
  absent: 'bg-rose-100 text-rose-800',
  unmarked: 'bg-muted text-muted-foreground',
}
export const DRILL_TITLE = {
  present: 'Present days', late: 'Late days', half_day: 'Half days', leave: 'Days on leave', absent: 'Absent days', overtime: 'Overtime days',
}

/** "Morning 09:00-18:00", "09:00-20:00" or "Flexible" for the shift an attendance row belongs to. */
export const shiftLabel = (sh) => (sh ? [sh.name, sh.start && sh.end ? `${sh.start}-${sh.end}` : null].filter(Boolean).join(' ') : '')
export const hhmm = (iso) => (iso ? String(iso).slice(11, 16) : '')
const longDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function KindBadge({ row }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_TONE[row.kind]}`}>{KIND_LABEL[row.kind] || row.kind}</span>
      {row.late && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">Late</span>}
      {row.overtime && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">Overtime</span>}
    </span>
  )
}

/**
 * Right-hand panel shell: slides in over a fading backdrop, and slides out again on close
 * (Esc, backdrop, X, or closeRef.current() from the caller). Honours reduced-motion.
 */
const DRAWER_MS = 250
function Drawer({ title, subtitle, onClose, children, footer, width = 'max-w-md', z = 'z-50', closeRef }) {
  const [shown, setShown] = useState(false)
  const leaving = useRef(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  const close = useCallback(() => {
    if (leaving.current) return
    leaving.current = true
    setShown(false)
    setTimeout(onClose, DRAWER_MS)
  }, [onClose])
  if (closeRef) closeRef.current = close

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [close])

  // Rendered on <body>: inside the page layout a fixed panel is cropped by the scrolling content area.
  return createPortal(
    <div className={`fixed inset-0 ${z} flex justify-end`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity motion-reduce:transition-none ${shown ? 'opacity-100 ease-out' : 'opacity-0 ease-in'}`} style={{ transitionDuration: `${DRAWER_MS}ms` }} onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-label={title}
        style={{ transitionDuration: `${DRAWER_MS}ms` }}
        className={`relative flex h-dvh max-h-full w-full ${width} flex-col bg-card shadow-xl transition-transform motion-reduce:transition-none ${shown ? 'translate-x-0 ease-out' : 'translate-x-full ease-in'}`}
      >
        <header className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close"><X className="h-4 w-4" /></Button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="border-t px-5 py-3">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

const CHOICES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'On leave' },
]

/**
 * Correct one person's day. target: a row of the attendance reports.
 * Late, half day and overtime are not picked here: the shift rules work them out from the times.
 */
export function MarkDayDrawer({ target, onClose, onSaved }) {
  const qc = useQueryClient()
  const start = ['absent', 'leave'].includes(target.kind) ? target.kind : 'present'
  const [choice, setChoice] = useState(start)
  const [checkIn, setCheckIn] = useState(hhmm(target.check_in))
  const [checkOut, setCheckOut] = useState(hhmm(target.check_out))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const closeRef = useRef(null)

  const save = useMutation({
    mutationFn: () => {
      if (choice === 'present' && checkIn && checkOut && checkOut <= checkIn) throw new Error('Check-out must be after check-in.')
      return attendanceService.markDay({
        employee_id: target.employee_id,
        attendance_date: target.date,
        branch_id: target.branch_id || undefined,
        mode: choice,
        ...(choice === 'present' ? { check_in: checkIn ? `${target.date}T${checkIn}` : undefined, check_out: checkOut ? `${target.date}T${checkOut}` : undefined } : {}),
        ...(choice !== 'present' && reason.trim() ? { reason: reason.trim() } : {}),
      })
    },
    onSuccess: () => {
      toast.success(`${target.name}: ${choice === 'leave' ? 'on leave' : choice} on ${target.date}`)
      qc.invalidateQueries({ queryKey: ['hub-attendance'] })
      qc.invalidateQueries({ queryKey: ['hub-staff-detail'] })
      onSaved?.()
      closeRef.current?.()
    },
    onError: (e) => setError(e?.response?.data?.error?.message || e?.response?.data?.message || e.message || 'Could not save.'),
  })

  return (
    <Drawer
      title="Correct attendance"
      subtitle={`${target.name} · ${longDate(target.date)}${target.branch ? ` · ${target.branch}` : ''}`}
      onClose={onClose}
      closeRef={closeRef}
      z="z-[60]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => closeRef.current?.()} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => { setError(''); save.mutate() }} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
        </div>
      }
    >
      <div className="space-y-5 px-5 py-4">
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-[13px]">
          Now: <KindBadge row={target} />
          {target.check_in && <span className="ml-2 text-muted-foreground">{hhmm(target.check_in)} to {hhmm(target.check_out) || '—'}</span>}
          {target.auto && <p className="mt-1 text-[12px] text-muted-foreground">The system marked this day itself because nobody punched.</p>}
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Mark as</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mark as">
            {CHOICES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={choice === c.value}
                onClick={() => setChoice(c.value)}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${choice === c.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {choice === 'present' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="md-in" className="mb-1 block text-xs font-medium text-muted-foreground">Check in</label>
              <Input id="md-in" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div>
              <label htmlFor="md-out" className="mb-1 block text-xs font-medium text-muted-foreground">Check out</label>
              <Input id="md-out" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <p className="col-span-2 text-[12px] text-muted-foreground">
              Late, half day and overtime are worked out from these times and the shift rules, so they cannot be set by hand. Leave a time empty to keep what is there.
            </p>
          </div>
        )}
        {choice === 'absent' && (
          <p className="text-[13px] text-muted-foreground">Counts as not worked. A day that already has punches cannot be marked absent; change its times or mark it on leave instead.</p>
        )}
        {choice === 'leave' && <p className="text-[13px] text-muted-foreground">Marks the day as leave. It is not counted as worked.</p>}
        {choice !== 'present' && (
          <div>
            <label htmlFor="md-reason" className="mb-1 block text-xs font-medium text-muted-foreground">Reason (optional)</label>
            <Input id="md-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
        )}

        {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      </div>
    </Drawer>
  )
}

/** The days behind one number of the summary. Click a day to correct it. */
export function DaysDrawer({ employeeId, name, kind, from, to, branchId, onClose }) {
  const [edit, setEdit] = useState(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['hub-attendance', 'days', employeeId, kind, from, to, branchId],
    queryFn: () => reportsService.hubAttendanceDays({ employee_id: employeeId, kind, start_date: from, end_date: to, branch_id: branchId || undefined }).then((r) => r.data),
  })
  const days = data?.days || []
  const sum = (k) => Math.round(days.reduce((n, d) => n + (d[k] || 0), 0) * 100) / 100

  return (
    <>
      <Drawer
        title={DRILL_TITLE[kind] || 'Days'}
        subtitle={`${name} · ${from} to ${to}`}
        onClose={onClose}
        width="max-w-lg"
        z="z-50"
        footer={
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">{days.length} day{days.length === 1 ? '' : 's'}</span>
            {kind === 'late' && <span className="font-medium">Late penalty ₹{sum('late_amount')} · {sum('late_hours')} h</span>}
            {kind === 'overtime' && <span className="font-medium">Overtime {sum('overtime_hours')} h</span>}
            {!['late', 'overtime'].includes(kind) && <span className="text-muted-foreground">Click a day to correct it</span>}
          </div>
        }
      >
        {isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          : error ? <p role="alert" className="m-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">Could not load the days.</p>
          : days.length === 0 ? <Empty>No days.</Empty> : (
            <ul className="divide-y">
              {days.map((d) => (
                <li key={`${d.date}-${d.branch_id}`}>
                  <button type="button" onClick={() => setEdit({ ...d, name })} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
                    <div>
                      <p className="text-[13px] font-medium">{longDate(d.date)}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {d.check_in ? `${hhmm(d.check_in)} to ${hhmm(d.check_out) || '—'} · ${d.hours} h` : 'No times'}
                        {d.overtime_hours > 0 ? ` · OT ${d.overtime_hours} h` : ''}
                        {d.late_amount > 0 ? ` · fine ₹${d.late_amount}` : ''}
                        {d.late_hours > 0 ? ` · ${d.late_hours} h off` : ''}
                      </p>
                      {(d.shift || d.planned_shift) && <p className="text-[12px] text-muted-foreground">Shift: {shiftLabel(d.shift || d.planned_shift)}{d.extend_hours > 0 ? ` (+${d.extend_hours} h)` : ''}</p>}
                    </div>
                    <KindBadge row={d} />
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Drawer>
      {edit && <MarkDayDrawer target={edit} onClose={() => setEdit(null)} />}
    </>
  )
}
