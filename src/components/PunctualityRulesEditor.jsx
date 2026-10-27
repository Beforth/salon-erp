import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/15'

export const emptyRule = () => ({ kind: 'early_arrival', mode: 'relative', minutes: '10', time: '09:00', amount: '', gender: 'all' })

/** API rules → editable rows (all fields strings). */
export const rulesToRows = (rules) => (rules || []).map((r) => ({
  kind: r.kind,
  mode: r.mode,
  minutes: r.minutes != null ? String(r.minutes) : '10',
  time: r.time || '09:00',
  amount: String(r.amount ?? ''),
  gender: r.gender || 'all',
}))

/** Editable rows → API rules, or an error message. */
export function rowsToRules(rows) {
  const out = []
  for (const [i, r] of rows.entries()) {
    const n = i + 1
    const amount = Number(r.amount)
    if (r.amount === '' || !Number.isFinite(amount) || amount < 0) return { ok: false, error: `Punctuality rule ${n}: enter the ₹ amount` }
    if (r.mode === 'relative') {
      const minutes = Number(r.minutes)
      if (r.minutes === '' || !Number.isInteger(minutes) || minutes < 0 || minutes > 720) return { ok: false, error: `Punctuality rule ${n}: minutes must be a whole number (0–720)` }
      out.push({ kind: r.kind, mode: 'relative', minutes, amount, gender: r.gender })
    } else {
      if (!HHMM_RE.test(r.time || '')) return { ok: false, error: `Punctuality rule ${n}: pick a time` }
      out.push({ kind: r.kind, mode: 'clock', time: r.time, amount, gender: r.gender })
    }
  }
  return { ok: true, value: out }
}

/**
 * Early-arrival / late-departure rules. Each rule: when (minutes from the shift, or a fixed clock time),
 * how much (₹ per day) and for whom (everyone / male / female).
 */
export default function PunctualityRulesEditor({ rows, onChange, shiftBased = true }) {
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="rounded-md border p-2 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-end sm:gap-2">
          <div className="sm:w-40">
            <div className="mb-1 text-xs text-muted-foreground">Rule</div>
            <SelectField value={r.kind} onChange={(e) => set(i, { kind: e.target.value })} className={selectCls}>
              <option value="early_arrival">Early arrival</option>
              <option value="late_departure">Late departure</option>
            </SelectField>
          </div>
          <div className="sm:w-44">
            <div className="mb-1 text-xs text-muted-foreground">Measured</div>
            <SelectField value={r.mode} onChange={(e) => set(i, { mode: e.target.value })} className={selectCls}>
              <option value="relative">{r.kind === 'early_arrival' ? 'Minutes before shift start' : 'Minutes after shift end'}</option>
              <option value="clock">{r.kind === 'early_arrival' ? 'By a clock time' : 'At / after a clock time'}</option>
            </SelectField>
          </div>
          <div className="sm:w-28">
            <div className="mb-1 text-xs text-muted-foreground">{r.mode === 'relative' ? 'Minutes' : 'Time'}</div>
            {r.mode === 'relative' ? (
              <Input type="number" min="0" max="720" value={r.minutes} onChange={(e) => set(i, { minutes: e.target.value })} />
            ) : (
              <Input type="time" value={r.time} onChange={(e) => set(i, { time: e.target.value })} />
            )}
          </div>
          <div className="sm:w-24">
            <div className="mb-1 text-xs text-muted-foreground">Pay (₹/day)</div>
            <Input type="number" min="0" value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} placeholder="e.g. 50" />
          </div>
          <div className="sm:w-32">
            <div className="mb-1 text-xs text-muted-foreground">For</div>
            <SelectField value={r.gender} onChange={(e) => set(i, { gender: e.target.value })} className={selectCls}>
              <option value="all">Everyone</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </SelectField>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400 hover:text-red-600" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove rule">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyRule()])}>
        <Plus className="h-4 w-4 mr-1" /> Add rule
      </Button>
      <p className="text-xs text-muted-foreground">
        {shiftBased ? 'Minutes are counted from this shift’s start/end; a clock time ignores the shift. ' : ''}
        The best-paying matching rule counts each day — one for arrival and one for leaving.
      </p>
    </div>
  )
}
