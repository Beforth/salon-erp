import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { purchaseBatchService } from '@/services/purchaseBatch.service'
import RecordPaymentModal from '@/components/modals/RecordPaymentModal'

export default function PurchaseBatchDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-batch', id],
    queryFn: () => purchaseBatchService.getBatchById(id),
    enabled: !!id,
  })
  const batch = data?.data || data || {}

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
        <p className="text-gray-500">Batch not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/purchase-batches')}>Back to Batches</Button>
      </div>
    )
  }

  const progressPct = batch.total_amount > 0 ? Math.round((batch.paid_amount / batch.total_amount) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/purchase-batches')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Batch</h1>
          <p className="text-sm text-gray-500 mt-1">{batch.supplier?.name} — {formatDate(batch.purchase_date)}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(batch.total_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(batch.paid_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(batch.pending_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Payment Progress</p>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 rounded-full h-2 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{progressPct}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Supplier Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-medium">{batch.supplier?.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Phone</p>
              <p>{batch.supplier?.phone || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p>{batch.supplier?.email || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Branch</p>
              <p>{batch.branch_name}</p>
            </div>
          </div>
          {batch.notes && (
            <div className="mt-3 text-sm">
              <p className="text-gray-500">Notes</p>
              <p>{batch.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batch.items || []).map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{item.sku || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{item.barcode || '—'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Payments</CardTitle>
            {batch.pending_amount > 0 && (
              <Button size="sm" onClick={() => setPaymentModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(batch.payments || []).length === 0 ? (
            <p className="text-center text-gray-500 py-6">No payments recorded</p>
          ) : (
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
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{p.payment_mode}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{p.notes || '—'}</TableCell>
                    <TableCell className="text-sm">{p.created_by?.full_name || '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
