import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { PiggyBank, Plus, ArrowDownToLine, ArrowUpFromLine, History, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { savingsPotService } from '@/services/savingsPot.service'
import SavingsPotModal from '@/components/modals/SavingsPotModal'
import SavingsPotDepositModal from '@/components/modals/SavingsPotDepositModal'
import SavingsPotWithdrawModal from '@/components/modals/SavingsPotWithdrawModal'
import SavingsPotHistoryModal from '@/components/modals/SavingsPotHistoryModal'

export default function SavingsPotsPage() {
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()

  const [potModalOpen, setPotModalOpen] = useState(false)
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [editPot, setEditPot] = useState(null)
  const [selectedPot, setSelectedPot] = useState(null)
  const [showReminders, setShowReminders] = useState(true)

  const { data: potsData, isLoading } = useQuery({
    queryKey: ['savings-pots', user?.branchId],
    queryFn: () => savingsPotService.getPots({ branch_id: user?.branchId }),
  })
  const pots = potsData?.data || []

  const { data: remindersData } = useQuery({
    queryKey: ['savings-pot-reminders', user?.branchId],
    queryFn: () => savingsPotService.getReminders({ branch_id: user?.branchId }),
  })
  const reminders = remindersData?.data || []

  const deleteMutation = useMutation({
    mutationFn: (id) => savingsPotService.deletePot(id),
    onSuccess: () => {
      toast.success('Savings pot deleted')
      queryClient.invalidateQueries({ queryKey: ['savings-pots'] })
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to delete'),
  })

  const handleDelete = (pot) => {
    if (window.confirm(`Delete "${pot.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(pot.pot_id)
    }
  }

  const getProgressPercent = (balance, target) => {
    if (!target || target === 0) return 0
    return Math.min(100, Math.round((balance / target) * 100))
  }

  const getMaturityStatus = (pot) => {
    if (!pot.maturity_date) return null
    const now = new Date()
    const maturity = new Date(pot.maturity_date)
    const daysLeft = Math.ceil((maturity - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return { label: 'Matured', variant: 'default' }
    if (daysLeft <= 30) return { label: `${daysLeft}d left`, variant: 'secondary' }
    return { label: `${daysLeft}d left`, variant: 'outline' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Savings Pots</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fixed deposits and savings accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDepositModalOpen(true)} disabled={pots.length === 0}>
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Deposit
          </Button>
          <Button onClick={() => { setEditPot(null); setPotModalOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            New Pot
          </Button>
        </div>
      </div>

      {/* Reminders Banner */}
      {showReminders && reminders.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Maturity Reminders</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-0.5">
                    {reminders.map((pot) => (
                      <li key={pot.pot_id}>
                        <span className="font-medium">{pot.name}</span> — {formatCurrency(pot.balance)} balance, matures {formatDate(pot.maturity_date)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button onClick={() => setShowReminders(false)} className="text-amber-600 hover:text-amber-800 text-sm">
                Dismiss
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pots Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : pots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PiggyBank className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No savings pots yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pots.map((pot) => {
            const progress = getProgressPercent(pot.balance, pot.target_amount)
            const maturity = getMaturityStatus(pot)
            return (
              <Card key={pot.pot_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{pot.name}</CardTitle>
                      {pot.account_number && (
                        <p className="text-sm text-gray-500 font-mono mt-0.5">{pot.account_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {maturity && <Badge variant={maturity.variant}>{maturity.label}</Badge>}
                      {pot.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Balance & Target */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Balance</span>
                      <span className="font-semibold">{formatCurrency(pot.balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Target</span>
                      <span className="text-gray-600">{formatCurrency(pot.target_amount)}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{progress}% of target</p>
                  </div>

                  {/* Info */}
                  <div className="text-sm text-gray-500 space-y-0.5">
                    {pot.duration_months && <p>Duration: {pot.duration_months} months</p>}
                    {pot.start_date && <p>Started: {formatDate(pot.start_date)}</p>}
                    {pot.maturity_date && <p>Maturity: {formatDate(pot.maturity_date)}</p>}
                    {pot.branch_name && <p>Branch: {pot.branch_name}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedPot(pot); setWithdrawModalOpen(true) }}
                    >
                      <ArrowUpFromLine className="h-3 w-3 mr-1" />
                      Withdraw
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedPot(pot); setHistoryModalOpen(true) }}
                    >
                      <History className="h-3 w-3 mr-1" />
                      History
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditPot(pot); setPotModalOpen(true) }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(pot)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <SavingsPotModal
        open={potModalOpen}
        onOpenChange={(open) => { setPotModalOpen(open); if (!open) setEditPot(null) }}
        editPot={editPot}
      />
      <SavingsPotDepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
        pots={pots.filter((p) => p.is_active)}
      />
      <SavingsPotWithdrawModal
        open={withdrawModalOpen}
        onOpenChange={(open) => { setWithdrawModalOpen(open); if (!open) setSelectedPot(null) }}
        pot={selectedPot}
      />
      <SavingsPotHistoryModal
        open={historyModalOpen}
        onOpenChange={(open) => { setHistoryModalOpen(open); if (!open) setSelectedPot(null) }}
        pot={selectedPot}
      />
    </div>
  )
}
