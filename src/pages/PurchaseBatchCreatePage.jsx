import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { purchaseBatchService } from '@/services/purchaseBatch.service'
import { supplierService } from '@/services/supplier.service'
import { productService } from '@/services/product.service'
import { branchService } from '@/services/branch.service'
import SupplierModal from '@/components/modals/SupplierModal'

export default function PurchaseBatchCreatePage() {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const [supplierId, setSupplierId] = useState('')
  const [branchId, setBranchId] = useState(user?.branchId || '')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ product_id: '', quantity: '', unit_cost: '' }])
  const [addPayment, setAddPayment] = useState(false)
  const [payment, setPayment] = useState({ amount: '', payment_mode: 'cash', notes: '' })
  const [autoAddInventory, setAutoAddInventory] = useState(false)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', { branch: branchId }],
    queryFn: () => supplierService.getSuppliers({ branch_id: branchId || undefined, limit: 100 }),
  })
  const suppliers = suppliersData?.data || []

  const { data: productsData } = useQuery({
    queryKey: ['products', { branch: branchId }],
    queryFn: () => productService.getProducts({ limit: 500 }),
  })
  const products = productsData?.data || []

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
  })
  const branchesList = branchesData?.data || []

  const totalAmount = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const cost = Number(item.unit_cost) || 0
    return sum + qty * cost
  }, 0)

  const addItem = () => setItems([...items, { product_id: '', quantity: '', unit_cost: '' }])

  const removeItem = (index) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index, field, value) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const mutation = useMutation({
    mutationFn: (data) => purchaseBatchService.createBatch(data),
    onSuccess: (res) => {
      toast.success('Purchase batch created')
      const batchId = res?.data?.batch_id || res?.batch_id
      if (batchId) navigate(`/purchase-batches/${batchId}`)
      else navigate('/purchase-batches')
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create batch'),
  })

  const handleSubmit = () => {
    if (!supplierId) return toast.error('Select a supplier')
    if (!branchId) return toast.error('Select a branch')

    const validItems = items.filter((i) => i.product_id && Number(i.quantity) > 0 && Number(i.unit_cost) > 0)
    if (validItems.length === 0) return toast.error('Add at least one item with product, quantity, and cost')

    const payload = {
      supplier_id: supplierId,
      branch_id: branchId,
      purchase_date: purchaseDate,
      notes: notes || undefined,
      items: validItems.map((i) => ({
        product_id: i.product_id,
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost),
      })),
      auto_add_inventory: autoAddInventory,
    }

    if (addPayment && Number(payment.amount) > 0) {
      payload.initial_payment = {
        amount: Number(payment.amount),
        payment_mode: payment.payment_mode,
        notes: payment.notes || undefined,
      }
    }

    mutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/purchase-batches')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Batch</h1>
          <p className="text-sm text-gray-500 mt-1">Record a new inventory purchase</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Purchase Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Supplier</Label>
              <div className="flex gap-2">
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.supplier_id} value={s.supplier_id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setSupplierModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branchesList.map((b) => (
                    <SelectItem key={b.branch_id} value={b.branch_id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="March restock" />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Select value={item.product_id} onValueChange={(val) => updateItem(i, 'product_id', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.product_id} value={p.product_id}>
                            {p.name} {p.sku ? `(${p.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} placeholder="0" className="w-20" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={item.unit_cost} onChange={(e) => updateItem(i, 'unit_cost', e.target.value)} placeholder="0" className="w-24" />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0))}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeItem(i)} disabled={items.length <= 1}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end px-4 py-3 border-t bg-gray-50">
            <span className="text-sm font-semibold">Grand Total: {formatCurrency(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Initial Payment */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="add_payment"
              checked={addPayment}
              onChange={(e) => setAddPayment(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="add_payment" className="cursor-pointer font-medium">Add initial payment</Label>
          </div>
          {addPayment && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <Label>Amount</Label>
                <Input type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={payment.payment_mode} onValueChange={(val) => setPayment({ ...payment, payment_mode: val })}>
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
                <Label>Notes</Label>
                <Input value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} placeholder="Advance" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto Add Inventory + Submit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto_inventory"
            checked={autoAddInventory}
            onChange={(e) => setAutoAddInventory(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="auto_inventory" className="cursor-pointer text-sm">Auto-add to inventory stock</Label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/purchase-batches')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Purchase Batch
          </Button>
        </div>
      </div>

      <SupplierModal
        open={supplierModalOpen}
        onOpenChange={setSupplierModalOpen}
        editSupplier={null}
        onSuccess={(supplier) => {
          if (supplier?.supplier_id) setSupplierId(supplier.supplier_id)
        }}
      />
    </div>
  )
}
