import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, RotateCcw, Save, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { branchService } from '@/services/branch.service'
import { incentiveConfigService } from '@/services/incentiveConfig.service'

const num = (v) => (v === '' || v === null || v === undefined ? '' : Number(v))

export default function StaffIncentiveConfig() {
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()
  const isOwner = user?.role === 'owner' || user?.role === 'developer'

  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [draft, setDraft] = useState(null)

  const { data: branchesResp } = useQuery({
    queryKey: ['branches', { active: true }],
    queryFn: () => branchService.getBranches({ active: true }),
  })
  const branches = useMemo(
    () => branchesResp?.data?.data?.filter((b) => b.is_salon !== false) || [],
    [branchesResp]
  )

  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0].branch_id || branches[0].id)
    }
  }, [branches, selectedBranchId])

  const { data: configResp, isLoading } = useQuery({
    queryKey: ['incentive-config', selectedBranchId],
    queryFn: () => incentiveConfigService.getForBranch(selectedBranchId),
    enabled: !!selectedBranchId,
  })

  useEffect(() => {
    if (configResp?.data?.data) {
      const c = configResp.data.data
      setDraft({
        punctualityTiers: [...(c.punctuality_tiers || [])],
        p1RevenueMultiplier: c.p1_revenue_multiplier,
        p1PayoutRate: c.p1_payout_rate,
        p2Tiers: [...(c.p2_tiers || [])],
        p3DailyThresholdRatio: c.p3_daily_threshold_ratio,
        p3DailyBonus: c.p3_daily_bonus,
        enabled: c.enabled,
      })
    }
  }, [configResp])

  const saveMutation = useMutation({
    mutationFn: (payload) => incentiveConfigService.updateForBranch(selectedBranchId, payload),
    onSuccess: () => {
      toast.success('Incentive config updated')
      queryClient.invalidateQueries({ queryKey: ['incentive-config', selectedBranchId] })
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || 'Failed to update incentive config'),
  })

  const resetMutation = useMutation({
    mutationFn: () => incentiveConfigService.resetForBranch(selectedBranchId),
    onSuccess: () => {
      toast.success('Reset to defaults')
      queryClient.invalidateQueries({ queryKey: ['incentive-config', selectedBranchId] })
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || 'Failed to reset incentive config'),
  })

  const updateDraft = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const updatePunctualityTier = (idx, key, value) => {
    setDraft((d) => {
      const tiers = d.punctualityTiers.map((t, i) => (i === idx ? { ...t, [key]: num(value) } : t))
      return { ...d, punctualityTiers: tiers }
    })
  }

  const addPunctualityTier = () => {
    setDraft((d) => ({
      ...d,
      punctualityTiers: [...d.punctualityTiers, { minutesEarly: 0, amount: 0 }],
    }))
  }

  const removePunctualityTier = (idx) => {
    setDraft((d) => ({
      ...d,
      punctualityTiers: d.punctualityTiers.filter((_, i) => i !== idx),
    }))
  }

  const updateP2Tier = (idx, key, value) => {
    setDraft((d) => {
      const tiers = d.p2Tiers.map((t, i) => (i === idx ? { ...t, [key]: num(value) } : t))
      return { ...d, p2Tiers: tiers }
    })
  }

  const addP2Tier = () => {
    setDraft((d) => ({
      ...d,
      p2Tiers: [...d.p2Tiers, { minServices: 0, rate: 0 }],
    }))
  }

  const removeP2Tier = (idx) => {
    setDraft((d) => ({ ...d, p2Tiers: d.p2Tiers.filter((_, i) => i !== idx) }))
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Owner access required to view or edit staff incentive configuration.
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Staff Incentive Configuration</CardTitle>
              <CardDescription>
                Per-branch parameters for monthly incentive computation. Changes apply to the
                live report immediately; locked snapshots keep the config used at lock time.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Branch</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id || b.id} value={b.branch_id || b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master enable */}
          <div className="flex items-center justify-between p-3 rounded border bg-gray-50">
            <div>
              <div className="font-medium">Incentive computation enabled</div>
              <p className="text-xs text-gray-500">
                When off, all employees in this branch get ₹0 incentive for the month.
              </p>
            </div>
            <Button
              size="sm"
              variant={draft.enabled ? 'default' : 'outline'}
              onClick={() => updateDraft({ enabled: !draft.enabled })}
            >
              {draft.enabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {/* Punctuality tiers */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Punctuality bonuses (daily)</h3>
              <Button size="sm" variant="outline" onClick={addPunctualityTier}>
                <Plus className="h-3 w-3 mr-1" /> Add tier
              </Button>
            </div>
            <p className="text-xs text-gray-500 mb-3 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Highest matching tier wins per day. Reference is the employee's shift start, falling
              back to branch open time. Flexible-timing staff are excluded.
            </p>
            <div className="space-y-2">
              {draft.punctualityTiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-24">If ≥</span>
                  <Input
                    type="number"
                    value={t.minutesEarly}
                    onChange={(e) => updatePunctualityTier(i, 'minutesEarly', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-gray-600">min early →</span>
                  <span className="text-sm text-gray-600">₹</span>
                  <Input
                    type="number"
                    value={t.amount}
                    onChange={(e) => updatePunctualityTier(i, 'amount', e.target.value)}
                    className="w-28"
                  />
                  <Button size="sm" variant="ghost" onClick={() => removePunctualityTier(i)}>
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* P1 */}
          <section>
            <h3 className="font-semibold mb-2">Priority 1 — Sales-based</h3>
            <p className="text-xs text-gray-500 mb-3">
              If monthly service revenue ≥ <code>baseSalary × multiplier</code>, employee earns
              <code> revenue × payout rate</code>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Revenue multiplier</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={draft.p1RevenueMultiplier}
                  onChange={(e) => updateDraft({ p1RevenueMultiplier: num(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Default 4.75 (= 0.95 × 5)</p>
              </div>
              <div>
                <Label>Payout rate (0–1)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={draft.p1PayoutRate}
                  onChange={(e) => updateDraft({ p1PayoutRate: num(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Default 0.10 (10% of revenue)</p>
              </div>
            </div>
          </section>

          {/* P2 */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Priority 2 — Service-count tiers</h3>
              <Button size="sm" variant="outline" onClick={addP2Tier}>
                <Plus className="h-3 w-3 mr-1" /> Add tier
              </Button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Used only when P1 misses. Highest matching tier wins. Payout is{' '}
              <code>baseSalary × rate</code>.
            </p>
            <div className="space-y-2">
              {draft.p2Tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-24">If ≥</span>
                  <Input
                    type="number"
                    value={t.minServices}
                    onChange={(e) => updateP2Tier(i, 'minServices', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-gray-600">services →</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={t.rate}
                    onChange={(e) => updateP2Tier(i, 'rate', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-gray-600">× base salary</span>
                  <Button size="sm" variant="ghost" onClick={() => removeP2Tier(i)}>
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* P3 */}
          <section>
            <h3 className="font-semibold mb-2">Priority 3 — Daily fallback</h3>
            <p className="text-xs text-gray-500 mb-3">
              Fires only when P1 and P2 both produce ₹0. For each day where service revenue ≥{' '}
              <code>baseSalary × ratio</code>, employee earns the daily bonus.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Daily threshold ratio (0–1)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={draft.p3DailyThresholdRatio}
                  onChange={(e) => updateDraft({ p3DailyThresholdRatio: num(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Default 0.10 (10% of base salary)</p>
              </div>
              <div>
                <Label>Daily bonus (₹)</Label>
                <Input
                  type="number"
                  step="1"
                  value={draft.p3DailyBonus}
                  onChange={(e) => updateDraft({ p3DailyBonus: num(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Default ₹50</p>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm('Reset incentive config for this branch to defaults?')) {
                  resetMutation.mutate()
                }
              }}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Reset to defaults
            </Button>
            <Button
              onClick={() => saveMutation.mutate(draft)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
