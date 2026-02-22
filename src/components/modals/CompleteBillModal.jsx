import { useState, useEffect, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
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

function CompleteBillModal({ open, onOpenChange, bill, partial = false }) {
  const queryClient = useQueryClient()
  const [payments, setPayments] = useState([{ payment_mode: 'cash', amount: '' }])
  const [notes, setNotes] = useState('')
  const [pendingItemIds, setPendingItemIds] = useState([])

  const totalAmount = bill?.total_amount || 0

  // Calculate payable amount: full total when not partial, or only completing items when partial
  const payableAmount = useMemo(() => {
    if (!partial || !bill?.items) return totalAmount
    const completingItems = bill.items.filter((item) => !pendingItemIds.includes(item.item_id))
    return completingItems.reduce((sum, item) => sum + (item.total_price || 0), 0)
  }, [partial, bill?.items, pendingItemIds, totalAmount])

  useEffect(() => {
    if (open && bill) {
      setNotes('')
      setPendingItemIds([])
      if (partial) {
        // In partial mode, start with empty payment until user selects items
        setPayments([{ payment_mode: 'cash', amount: '' }])
      } else {
        setPayments([{ payment_mode: 'cash', amount: totalAmount > 0 ? totalAmount.toFixed(2) : '' }])
      }
    }
  }, [open, bill, totalAmount, partial])

  // Auto-update payment amount when pending selection changes (single payment mode only)
  useEffect(() => {
    if (partial && payments.length === 1 && payableAmount > 0) {
      setPayments([{ ...payments[0], amount: payableAmount.toFixed(2) }])
    }
  }, [payableAmount, partial])

  const completeMutation = useMutation({
    mutationFn: (data) => billService.completeBill(bill.bill_id, data),
    onSuccess: () => {
      toast.success(partial ? 'Partial bill completed!' : 'Bill completed successfully!')
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
  const remaining = payableAmount - totalPaid

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
    const remainingAmount = Math.max(0, payableAmount - otherPayments)
    handlePaymentChange(index, 'amount', remainingAmount.toFixed(2))
  }

  const handleTogglePendingItem = (itemId) => {
    setPendingItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleSubmit = () => {
    const validPayments = payments.filter((p) => parseFloat(p.amount) > 0)
    if (validPayments.length === 0) {
      toast.error('Please add at least one payment')
      return
    }

    if (partial) {
      // Validate: at least 1 item must stay pending, and not all items can be pending
      if (pendingItemIds.length === 0) {
        toast.error('Select at least one item to keep pending for partial completion')
        return
      }
      if (bill.items && pendingItemIds.length === bill.items.length) {
        toast.error('Cannot keep all items pending — select some items to complete')
        return
      }
    }

    const paymentTotal = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
    if (Math.abs(paymentTotal - payableAmount) > 0.01) {
      toast.error(
        `Payment total (${formatCurrency(paymentTotal)}) must equal ${partial ? 'payable' : 'bill'} total (${formatCurrency(payableAmount)})`
      )
      return
    }

    const payload = {
      payments: validPayments.map((p) => ({
        payment_mode: p.payment_mode,
        amount: parseFloat(p.amount),
      })),
      notes: notes || undefined,
    }

    if (partial && pendingItemIds.length > 0) {
      payload.pending_item_ids = pendingItemIds
    }

    completeMutation.mutate(payload)
  }

  if (!bill) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{partial ? 'Partial Bill Completion' : 'Complete Bill'}</DialogTitle>
          <p className="text-sm text-gray-500">
            {bill.bill_number} {bill.customer?.customer_name && `\u2022 ${bill.customer.customer_name}`}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Partial mode: item selection with checkboxes */}
          {partial && bill.items?.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Check items to keep <span className="text-amber-600 font-semibold">pending</span>
              </Label>
              <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                {bill.items.map((item) => {
                  const isPending = pendingItemIds.includes(item.item_id)
                  return (
                    <label
                      key={item.item_id}
                      className={`flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50 ${isPending ? 'bg-amber-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isPending}
                        onChange={() => handleTogglePendingItem(item.item_id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className={`text-sm flex-1 truncate ${isPending ? 'text-amber-700' : 'text-gray-700'}`}>
                        {item.item_name || item.service?.service_name || item.package?.package_name || item.product?.product_name || 'Item'}
                      </span>
                      <span className="text-sm text-gray-500 shrink-0">
                        {formatCurrency(item.total_price)}
                      </span>
                      {isPending && (
                        <Badge variant="warning" className="text-[10px] px-1.5 py-0">Pending</Badge>
                      )}
                    </label>
                  )
                })}
              </div>
              {pendingItemIds.length > 0 && (
                <p className="text-xs text-amber-600 mt-1.5">
                  {pendingItemIds.length} item{pendingItemIds.length > 1 ? 's' : ''} will remain pending
                </p>
              )}
            </div>
          )}

          {/* Items Summary (non-partial mode only) */}
          {!partial && bill.items?.length > 0 && (
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
              <span className="text-gray-500">Bill Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            {partial && pendingItemIds.length > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Pending Amount</span>
                <span>{formatCurrency(totalAmount - payableAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1 border-t">
              <span>{partial ? 'Pay Now' : 'Total'}</span>
              <span className="text-primary">{formatCurrency(payableAmount)}</span>
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
            disabled={completeMutation.isPending || Math.abs(totalPaid - payableAmount) > 0.01 || (partial && pendingItemIds.length === 0)}
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {partial ? `Pay ${formatCurrency(payableAmount)}` : `Complete Payment ${formatCurrency(payableAmount)}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompleteBillModal
