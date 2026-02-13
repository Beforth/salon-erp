import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billService } from '@/services/bill.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import {
  Loader2,
  Banknote,
  CreditCard,
  Smartphone,
  Plus,
  Trash2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: Smartphone },
]

function CompleteBillModal({ open, onOpenChange, bill }) {
  const queryClient = useQueryClient()
  const [payments, setPayments] = useState([{ payment_mode: 'cash', amount: '' }])
  const [notes, setNotes] = useState('')

  const totalAmount = bill?.total_amount || 0

  useEffect(() => {
    if (open && bill) {
      setPayments([{ payment_mode: 'cash', amount: totalAmount > 0 ? totalAmount.toFixed(2) : '' }])
      setNotes('')
    }
  }, [open, bill, totalAmount])

  const completeMutation = useMutation({
    mutationFn: (data) => billService.completeBill(bill.bill_id, data),
    onSuccess: () => {
      toast.success('Bill completed successfully!')
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['bill', String(bill.bill_id)] })
      queryClient.invalidateQueries({ queryKey: ['chairs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to complete bill')
    },
  })

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const remaining = totalAmount - totalPaid

  const handleAddPayment = () => {
    setPayments([...payments, { payment_mode: 'cash', amount: '' }])
  }

  const handleRemovePayment = (index) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index))
    }
  }

  const handlePaymentChange = (index, field, value) => {
    setPayments(payments.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const handleSetFullAmount = (index) => {
    const otherPayments = payments.reduce(
      (sum, p, i) => (i !== index ? sum + (parseFloat(p.amount) || 0) : sum),
      0
    )
    const remainingAmount = Math.max(0, totalAmount - otherPayments)
    handlePaymentChange(index, 'amount', remainingAmount.toFixed(2))
  }

  const handleSubmit = () => {
    const validPayments = payments.filter((p) => parseFloat(p.amount) > 0)
    if (validPayments.length === 0) {
      toast.error('Please add at least one payment')
      return
    }

    const paymentTotal = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
    if (Math.abs(paymentTotal - totalAmount) > 0.01) {
      toast.error(
        `Payment total (${formatCurrency(paymentTotal)}) must equal bill total (${formatCurrency(totalAmount)})`
      )
      return
    }

    completeMutation.mutate({
      payments: validPayments.map((p) => ({
        payment_mode: p.payment_mode,
        amount: parseFloat(p.amount),
      })),
      notes: notes || undefined,
    })
  }

  if (!bill) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Bill</DialogTitle>
          <p className="text-sm text-gray-500">
            {bill.bill_number} {bill.customer?.customer_name && `\u2022 ${bill.customer.customer_name}`}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items Summary */}
          {bill.items?.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 max-h-40 overflow-auto">
              {bill.items.map((item) => (
                <div key={item.item_id} className="flex justify-between">
                  <span className="text-gray-700 truncate flex-1">
                    {item.item_name || item.service?.service_name || item.package?.package_name || item.product?.product_name || 'Item'}
                  </span>
                  <span className="text-gray-500 ml-2 shrink-0">
                    {formatCurrency(item.unit_price)} x {item.quantity} = {formatCurrency(item.total_price)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            {bill.discount_amount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span>
                <span>-{formatCurrency(bill.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Payment</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddPayment}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Split
              </Button>
            </div>
            <div className="space-y-2">
              {payments.map((payment, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex gap-1">
                    {PAYMENT_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => handlePaymentChange(index, 'payment_mode', mode.value)}
                        className={`p-1.5 rounded border transition-colors ${
                          payment.payment_mode === mode.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={mode.label}
                      >
                        <mode.icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={payment.amount}
                      onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                      className="pr-14"
                    />
                    <button
                      type="button"
                      onClick={() => handleSetFullAmount(index)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary hover:underline"
                    >
                      Full
                    </button>
                  </div>
                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {payments.length > 1 && (
              <div className="text-xs flex gap-4 mt-1">
                <span className="text-gray-500">Paid: {formatCurrency(totalPaid)}</span>
                {remaining !== 0 && (
                  <span className={remaining > 0 ? 'text-red-500' : 'text-green-500'}>
                    {remaining > 0 ? 'Remaining' : 'Excess'}: {formatCurrency(Math.abs(remaining))}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium mb-1 block">Notes (optional)</Label>
            <Input
              placeholder="Add notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={completeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={completeMutation.isPending || Math.abs(totalPaid - totalAmount) > 0.01}
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete Payment {formatCurrency(totalAmount)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteBillModal
