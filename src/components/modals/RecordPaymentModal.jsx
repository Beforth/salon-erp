import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { purchaseBatchService } from '@/services/purchaseBatch.service'

export default function RecordPaymentModal({ open, onOpenChange, batch }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    amount: '',
    payment_mode: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    if (open) {
      setFormData({
        amount: '',
        payment_mode: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      })
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: (data) => purchaseBatchService.recordPayment(batch.batch_id, data),
    onSuccess: () => {
      toast.success('Payment recorded')
      queryClient.invalidateQueries({ queryKey: ['purchase-batch', batch.batch_id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-batches'] })
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed'),
  })

  const handleSubmit = () => {
    const amount = Number(formData.amount)
    if (!amount || amount <= 0) return toast.error('Enter a valid amount')
    if (batch && amount > batch.pending_amount) return toast.error('Amount exceeds pending balance')
    mutation.mutate({ ...formData, amount })
  }

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Pending Amount</span>
              <span className="font-semibold text-red-600">{formatCurrency(batch.pending_amount)}</span>
            </div>
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              max={batch.pending_amount}
            />
          </div>
          <div>
            <Label>Payment Mode</Label>
            <Select value={formData.payment_mode} onValueChange={(val) => setFormData({ ...formData, payment_mode: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Second installment" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
