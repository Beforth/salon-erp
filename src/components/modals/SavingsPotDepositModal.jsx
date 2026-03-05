import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { savingsPotService } from '@/services/savingsPot.service'

export default function SavingsPotDepositModal({ open, onOpenChange, pots }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    total_amount: '',
    person_name: '',
    date: new Date().toISOString().split('T')[0],
    divide_equally: true,
  })
  const [allocations, setAllocations] = useState([])

  useEffect(() => {
    if (open && pots.length > 0) {
      setAllocations(pots.map((p) => ({ savings_pot_id: p.pot_id, name: p.name, amount: '' })))
    }
  }, [open, pots])

  const equalShare = formData.total_amount && pots.length > 0
    ? Math.round((Number(formData.total_amount) / pots.length) * 100) / 100
    : 0

  const allocationsTotal = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  const mutation = useMutation({
    mutationFn: (data) => savingsPotService.deposit(data),
    onSuccess: () => {
      toast.success('Deposit recorded')
      queryClient.invalidateQueries({ queryKey: ['savings-pots'] })
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed'),
  })

  const handleSubmit = () => {
    const amount = Number(formData.total_amount)
    if (!amount || amount <= 0) return toast.error('Enter a valid amount')
    if (!formData.person_name.trim()) return toast.error('Person name is required')

    if (!formData.divide_equally) {
      if (Math.abs(allocationsTotal - amount) > 0.01) {
        return toast.error(`Allocations total (${formatCurrency(allocationsTotal)}) must equal total amount (${formatCurrency(amount)})`)
      }
    }

    const payload = {
      total_amount: amount,
      person_name: formData.person_name,
      date: formData.date,
      divide_equally: formData.divide_equally,
    }
    if (!formData.divide_equally) {
      payload.allocations = allocations
        .filter((a) => Number(a.amount) > 0)
        .map((a) => ({ savings_pot_id: a.savings_pot_id, amount: Number(a.amount) }))
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Deposit to Savings Pots</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total Amount</Label>
              <Input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="1600"
              />
            </div>
            <div>
              <Label>Person Name</Label>
              <Input
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Ramesh"
              />
            </div>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="divide_equally"
              checked={formData.divide_equally}
              onChange={(e) => setFormData({ ...formData, divide_equally: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="divide_equally" className="cursor-pointer">Divide equally among all pots</Label>
          </div>

          {/* Allocation Preview */}
          {pots.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Pot</th>
                    <th className="text-right px-3 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((alloc, i) => (
                    <tr key={alloc.savings_pot_id} className="border-t">
                      <td className="px-3 py-2">{alloc.name}</td>
                      <td className="px-3 py-2 text-right">
                        {formData.divide_equally ? (
                          <span className="text-gray-600">{formatCurrency(equalShare)}</span>
                        ) : (
                          <Input
                            type="number"
                            value={alloc.amount}
                            onChange={(e) => {
                              const updated = [...allocations]
                              updated[i] = { ...updated[i], amount: e.target.value }
                              setAllocations(updated)
                            }}
                            className="w-28 text-right ml-auto"
                            placeholder="0"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!formData.divide_equally && formData.total_amount && (
                <div className={`px-3 py-2 text-sm border-t ${Math.abs(allocationsTotal - Number(formData.total_amount)) > 0.01 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  Allocated: {formatCurrency(allocationsTotal)} / {formatCurrency(Number(formData.total_amount))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Deposit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
