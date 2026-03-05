import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { purchaseBatchService } from '@/services/purchaseBatch.service'
import { supplierService } from '@/services/supplier.service'

export default function PurchaseBatchesPage() {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', { branch: user?.branchId }],
    queryFn: () => supplierService.getSuppliers({ branch_id: user?.branchId, limit: 100 }),
  })
  const suppliers = suppliersData?.data || []

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-batches', { page, selectedSupplier, startDate, endDate, branch: user?.branchId }],
    queryFn: () => purchaseBatchService.getBatches({
      page,
      limit: 20,
      supplier_id: selectedSupplier || undefined,
      branch_id: user?.branchId || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
  })
  const batches = data?.data || []
  const pagination = data?.pagination || {}

  const totalPending = batches.reduce((sum, b) => sum + (b.pending_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Batches</h1>
          <p className="text-sm text-gray-500 mt-1">Track inventory purchases and payments</p>
        </div>
        <Button onClick={() => navigate('/purchase-batches/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Purchase
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Supplier</Label>
              <Select value={selectedSupplier} onValueChange={(val) => { setSelectedSupplier(val === 'all' ? '' : val); setPage(1) }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.supplier_id} value={s.supplier_id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} className="w-[150px]" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} className="w-[150px]" />
            </div>
            {(startDate || endDate || selectedSupplier) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); setSelectedSupplier(''); setPage(1) }}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : batches.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No purchase batches found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.batch_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/purchase-batches/${batch.batch_id}`)}>
                      <TableCell>{formatDate(batch.purchase_date)}</TableCell>
                      <TableCell className="font-medium">{batch.supplier?.name || '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(batch.total_amount)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(batch.paid_amount)}</TableCell>
                      <TableCell className="text-right">
                        {batch.pending_amount > 0 ? (
                          <span className="text-red-600 font-semibold">{formatCurrency(batch.pending_amount)}</span>
                        ) : (
                          <Badge variant="default">Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/purchase-batches/${batch.batch_id}`) }}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm font-medium">
                  Total Pending: <span className="text-red-600">{formatCurrency(totalPending)}</span>
                </div>
                {pagination.total_pages > 1 && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                    <span className="text-sm text-gray-500 px-2 self-center">Page {page} of {pagination.total_pages}</span>
                    <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
