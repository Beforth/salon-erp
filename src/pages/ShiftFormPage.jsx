import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { shiftService } from '@/services/shift.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { buildRulesPayload } from '@/lib/shiftRules'
import PunctualityRulesEditor, { rulesToRows, rowsToRules } from '@/components/PunctualityRulesEditor'

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const initialForm = {
  name: '', start_time: '', end_time: '', color_code: '#6366f1', grace_period: '5',
  half_day_late_after_min: '', half_day_min_hours: '',
}

const addMinutes = (hhmm, mins) => {
  if (!HHMM_RE.test(hhmm) || !Number.isFinite(mins)) return null
  const [h, m] = hhmm.split(':').map(Number)
  const t = (h * 60 + m + mins) % 1440
  const hh = Math.floor(t / 60)
  return `${String(hh).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Full-page create / edit for a shift (owner only). */
export default function ShiftFormPage() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initialForm)
  const [tiers, setTiers] = useState([])
  const [punctRows, setPunctRows] = useState([])
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => shiftService.getShiftById(id),
    enabled: isEditing,
  })
  const shift = data?.data

  useEffect(() => {
    if (!shift) return
    setForm({
      name: shift.name || '',
      start_time: shift.start_time || '',
      end_time: shift.end_time || '',
      color_code: shift.color_code || '#6366f1',
      grace_period: String(shift.grace_period ?? 5),
      half_day_late_after_min: shift.half_day_late_after_min == null ? '' : String(shift.half_day_late_after_min),
      half_day_min_hours: shift.half_day_min_hours == null ? '' : String(shift.half_day_min_hours),
    })
    setPunctRows(rulesToRows(shift.punctuality_rules))
    setTiers((shift.late_tiers || []).map((t) => {
      if (t.extend_hours != null) return { after_min: String(t.after_min), kind: 'extend', value: String(t.extend_hours) }
      if (t.deduct_hours == null && t.deduct_amount != null) return { after_min: String(t.after_min), kind: 'amount', value: String(t.deduct_amount) }
      return { after_min: String(t.after_min), kind: 'hours', value: String(t.deduct_hours ?? '') }
    }))
  }, [shift])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const grace = Number(form.grace_period)
  const graceUntil = addMinutes(form.start_time, grace)
  const goBack = () => navigate('/shifts')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Shift name is required'); return }
    if (!HHMM_RE.test(form.start_time)) { toast.error('Start time must be HH:MM'); return }
    if (!HHMM_RE.test(form.end_time)) { toast.error('End time must be HH:MM'); return }
    if (!Number.isInteger(grace) || grace < 0 || grace > 120) {
      toast.error('Grace period must be a whole number of minutes (0–120)')
      return
    }
    const built = buildRulesPayload({
      grace,
      tiers: tiers.map((t) => ({
        after_min: t.after_min,
        deduct_hours: t.kind === 'hours' ? t.value : '',
        deduct_amount: t.kind === 'amount' ? t.value : '',
        extend_hours: t.kind === 'extend' ? t.value : '',
      })),
      halfDayLateAfterMin: form.half_day_late_after_min,
      halfDayMinHours: form.half_day_min_hours,
    })
    if (!built.ok) { toast.error(built.error); return }
    const punct = rowsToRules(punctRows)
    if (!punct.ok) { toast.error(punct.error); return }

    const base = Object.fromEntries(Object.entries(form).filter(([k]) => !k.startsWith('half_day')))
    const payload = { ...base, grace_period: grace, ...built.value, punctuality_rules: punct.value }

    setSaving(true)
    try {
      if (isEditing) await shiftService.updateShift(id, payload)
      else await shiftService.createShift(payload)
      toast.success(isEditing ? 'Shift updated' : 'Shift created')
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['shift', id] })
      goBack()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save shift')
    } finally {
      setSaving(false)
    }
  }

  if (isEditing && isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/15'
  const setTier = (i, patch) => setTiers((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <button type="button" onClick={goBack} className="mb-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:underline">
          <ArrowLeft className="h-3 w-3" /> Shifts
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? `Edit shift${form.name ? ` · ${form.name}` : ''}` : 'Add shift'}</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Basics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shift_name">Shift name *</Label>
                <Input id="shift_name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Morning" autoFocus={!isEditing} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start time *</Label>
                  <Input id="start_time" type="time" value={form.start_time} onChange={(e) => set({ start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End time *</Label>
                  <Input id="end_time" type="time" value={form.end_time} onChange={(e) => set({ end_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grace_period">Grace period (minutes)</Label>
                <Input
                  id="grace_period" type="text" inputMode="numeric" value={form.grace_period} placeholder="e.g. 10"
                  onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) set({ grace_period: v }) }}
                />
                <p className="text-xs text-muted-foreground">
                  {graceUntil ? `Not late until ${graceUntil}. ` : ''}Late time on attendance is still counted from shift start.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Colour</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color_code} onChange={(e) => set({ color_code: e.target.value })} className="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5" />
                  <Input value={form.color_code} onChange={(e) => set({ color_code: e.target.value })} placeholder="#6366f1" className="w-28 font-mono text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: form.color_code }} />
                <span className="font-medium">{form.name || 'Untitled shift'}</span>
                <span className="font-mono text-gray-500">{form.start_time || '--:--'} – {form.end_time || '--:--'}</span>
              </div>
              <div className="text-gray-600">Late after {graceUntil || '—'}{tiers.length ? `, ${tiers.length} fine tier${tiers.length > 1 ? 's' : ''}` : ', no late fine'}</div>
              <div className="text-gray-600">
                {form.half_day_late_after_min !== '' ? `Half day if late > ${form.half_day_late_after_min} min` : 'No half-day by lateness'}
                {form.half_day_min_hours !== '' ? ` · or worked < ${form.half_day_min_hours} h` : ''}
              </div>
              <div className="text-gray-600">
                {punctRows.length ? `${punctRows.length} punctuality reward rule${punctRows.length > 1 ? 's' : ''} (replace branch rules)` : 'Uses branch-wide punctuality rules'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Late rules (fine or longer shift)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tiers.map((t, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <div className="w-36 space-y-1">
                    <Label className="text-xs">Late by (min) ≥</Label>
                    <Input type="number" min="1" value={t.after_min} onChange={(e) => setTier(i, { after_min: e.target.value })} />
                  </div>
                  <div className="w-40 space-y-1">
                    <Label className="text-xs">Fine type</Label>
                    <SelectField value={t.kind} onChange={(e) => setTier(i, { kind: e.target.value })} className={selectCls}>
                      <option value="amount">₹ Amount</option>
                      <option value="hours">Hours of pay</option>
                      <option value="extend">Extend shift (hours)</option>
                    </SelectField>
                  </div>
                  <div className="w-36 space-y-1">
                    <Label className="text-xs">{t.kind === 'amount' ? 'Deduct (₹)' : t.kind === 'extend' ? 'Extra hours' : 'Deduct (hours)'}</Label>
                    <Input type="number" min="0" step={t.kind === 'amount' ? '1' : '0.25'} placeholder={t.kind === 'amount' ? 'e.g. 100' : 'e.g. 1'} value={t.value} onChange={(e) => setTier(i, { value: e.target.value })} />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-10 w-10 p-0 text-red-400 hover:text-red-600" onClick={() => setTiers((rows) => rows.filter((_, j) => j !== i))} aria-label="Remove tier">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setTiers((rows) => [...rows, { after_min: '', kind: 'amount', value: '' }])}>
                <Plus className="mr-1 h-4 w-4" /> Add tier
              </Button>
              <p className="text-xs text-muted-foreground">
                Applies after the grace period; the highest tier reached is used. A ₹ amount is deducted from salary as-is; hours are deducted at the employee's hourly rate. "Extend shift" adds hours to that day's shift instead of a fine, for example 10 min late → +1 hour, 20 min late → +2 hours. Leave empty for no late fine.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Punctuality rewards (early arrival / late leaving)</CardTitle></CardHeader>
            <CardContent>
              <PunctualityRulesEditor rows={punctRows} onChange={setPunctRows} />
              <p className="mt-2 text-xs text-muted-foreground">
                If this shift has rules they are used instead of the branch-wide rules in Incentive settings. Leave empty to use the branch rules.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Half day</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="half_day_late_after_min" className="text-xs">Half day if late by more than (min)</Label>
                  <Input id="half_day_late_after_min" type="number" min="0" value={form.half_day_late_after_min} onChange={(e) => set({ half_day_late_after_min: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="half_day_min_hours" className="text-xs">Half day if worked less than (hours)</Label>
                  <Input id="half_day_min_hours" type="number" min="0" step="0.25" value={form.half_day_min_hours} onChange={(e) => set({ half_day_min_hours: e.target.value })} />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Leave blank to turn a rule off</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 -mx-1 border-t bg-background/95 px-1 py-3 backdrop-blur">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save changes' : 'Create shift'}
          </Button>
        </div>
      </div>
    </form>
  )
}
