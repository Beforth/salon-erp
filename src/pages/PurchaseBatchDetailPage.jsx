import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Plus,
  PackageCheck,
  Clock,
  IndianRupee,
  CheckCircle2,
  Building2,
  Package,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { purchaseBatchService } from '@/services/purchaseBatch.service'
import RecordPaymentModal from '@/components/modals/RecordPaymentModal'

function StatCard({ icon: Icon, label, value, tone = 'default', children }) {
  const tones = {
    default: 'bg-gray-50 text-gray-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-md shrink-0 ${tones[tone] || tones.default}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{label}</p>
            {children || <p className="text-xl font-semibold mt-0.5 tabular-nums">{value}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PurchaseBatchDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-batch', id],
    queryFn: () => purchaseBatchService.getBatchById(id),
    enabled: !!id,
  })
  const batch = data?.data || data || {}

  const receiveStockMutation = useMutation({
    mutationFn: () => purchaseBatchService.receiveStock(id),
    onSuccess: () => {
      toast.success('Stock received into inventory')
      queryClient.invalidateQueries({ queryKey: ['purchase-batch', id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-batches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to receive stock'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!batch.batch_id) {
    return (
      <div className="text-center py-20">
        <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Purchase batch not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/purchase-batches')}>
          Back to list
        </Button>
      </div>
    )
  }

  const progressPct =
    batch.total_amount > 0 ? Math.round((batch.paid_amount / batch.total_amount) * 100) : 0
  const itemCount = (batch.items || []).length
  const totalQty = (batch.items || []).reduce((s, i) => s + (i.quantity || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchase-batches')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Purchase batch</h1>
              {batch.stock_received ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">
                  <PackageCheck className="h-3 w-3 mr-1" />
                  Stock received
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-50">
                  <Clock className="h-3 w-3 mr-1" />
                  Awaiting stock
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {batch.supplier?.name} · {formatDateTime(batch.purchase_date)} · {batch.branch_name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {!batch.stock_received && (
            <Button
              onClick={() => receiveStockMutation.mutate()}
              disabled={receiveStockMutation.isPending}
            >
              {receiveStockMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PackageCheck className="h-4 w-4 mr-2" />
              )}
              Receive into inventory
            </Button>
          )}
          {batch.pending_amount > 0 && (
            <Button variant="outline" onClick={() => setPaymentModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record payment
            </Button>
          )}
        </div>
      </div>

      {!batch.stock_received && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Stock not in inventory yet</p>
            <p className="text-amber-800/90 mt-0.5">
              This purchase is recorded but quantities are not available for sale or transfer until
              you receive it into inventory.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} label="Total amount" value={formatCurrency(batch.total_amount)} />
        <StatCard
          icon={CheckCircle2}
          label="Paid"
          value={formatCurrency(batch.paid_amount)}
          tone="green"
        />
        <StatCard
          icon={Clock}
          label="Pending payment"
          value={formatCurrency(batch.pending_amount)}
          tone={batch.pending_amount > 0 ? 'red' : 'green'}
        />
        <StatCard icon={Package} label="Items / units" value={`${itemCount} / ${totalQty}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Line items</CardTitle>
            <CardDescription>Products included in this purchase</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(batch.items || []).map((item) => (
                    <TableRow key={item.item_id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{item.sku || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.unit_cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(item.total_cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-base">Supplier</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Name</p>
                <p className="font-medium">{batch.supplier?.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Phone</p>
                <p>{batch.supplier?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Email</p>
                <p className="break-all">{batch.supplier?.email || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Destination</p>
                <p>{batch.branch_name}</p>
              </div>
              {batch.notes && (
                <div className="pt-2 border-t">
                  <p className="text-gray-500 text-xs">Notes</p>
                  <p className="text-gray-700">{batch.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-500 rounded-full h-2.5 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 tabular-nums">
                {progressPct}% paid · {formatCurrency(batch.paid_amount)} of{' '}
                {formatCurrency(batch.total_amount)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Payments</CardTitle>
              <CardDescription>Supplier payment history for this batch</CardDescription>
            </div>
            {batch.pending_amount > 0 && (
              <Button size="sm" variant="outline" onClick={() => setPaymentModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(batch.payments || []).length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">No payments recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.payments.map((p) => (
                    <TableRow key={p.payment_id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(p.payment_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize font-normal">
                          {p.payment_mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                        {p.notes || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{p.created_by?.full_name || '—'}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        batch={batch}
      />
    </div>
  )
}
