import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventory.service'
import { productService } from '@/services/product.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Warehouse,
  Loader2,
  Plus,
  Minus,
  AlertTriangle,
  ArrowRightLeft,
  X,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

function InventoryPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [adjustData, setAdjustData] = useState({
    product_id: '',
    location_id: '',
    quantity: '',
    adjustment_type: 'add',
    reason: '',
  })
  const [transferData, setTransferData] = useState({
    from_location_id: '',
    to_location_id: '',
    items: [{ product_id: '', quantity: '' }],
    notes: '',
  })

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', { page, location_id: selectedLocation }],
    queryFn: () => inventoryService.getInventory({ page, limit: 20, location_id: selectedLocation || undefined }),
  })

  const { data: locationsData } = useQuery({
    queryKey: ['inventory-locations'],
    queryFn: () => inventoryService.getLocations(),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productService.getProducts({ limit: 1000 }),
  })

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: () => productService.getLowStock(),
  })

  const inventory = inventoryData?.data || []
  const pagination = inventoryData?.pagination || { page: 1, totalPages: 1, total: 0 }
  const locations = locationsData?.data || []
  const products = productsData?.data || []
  const lowStockProducts = lowStockData?.data || []

  const adjustMutation = useMutation({
    mutationFn: inventoryService.adjustStock,
    onSuccess: () => {
      toast.success('Stock adjusted successfully')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['low-stock-products'])
      setShowAdjustModal(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to adjust stock')
    },
  })

  const transferMutation = useMutation({
    mutationFn: inventoryService.createTransfer,
    onSuccess: () => {
      toast.success('Stock transfer created successfully')
      queryClient.invalidateQueries(['inventory'])
      setShowTransferModal(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create transfer')
    },
  })

  const handleAdjust = (e) => {
    e.preventDefault()
    adjustMutation.mutate({
      ...adjustData,
      quantity: parseInt(adjustData.quantity),
    })
  }

  const handleTransfer = (e) => {
    e.preventDefault()
    const validItems = transferData.items.filter((i) => i.product_id && i.quantity > 0)
    if (validItems.length === 0) {
      toast.error('Add at least one product to transfer')
      return
    }
    transferMutation.mutate({
      ...transferData,
      items: validItems.map((i) => ({ product_id: i.product_id, quantity: parseInt(i.quantity) })),
    })
  }

  const addTransferItem = () => {
    setTransferData({
      ...transferData,
      items: [...transferData.items, { product_id: '', quantity: '' }],
    })
  }

  const removeTransferItem = (index) => {
    setTransferData({
      ...transferData,
      items: transferData.items.filter((_, i) => i !== index),
    })
  }

  const updateTransferItem = (index, field, value) => {
    const newItems = [...transferData.items]
    newItems[index][field] = value
    setTransferData({ ...transferData, items: newItems })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500">Manage stock levels and transfers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Stock Transfer
          </Button>
          <Button onClick={() => setShowAdjustModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adjust Stock
          </Button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts
              <Badge variant="destructive" className="ml-2">
                {lowStockProducts.length} products
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <Badge key={product.product_id} variant="outline" className="bg-white">
                  {product.product_name}: {product.total_stock} (need {product.reorder_level})
                </Badge>
              ))}
              {lowStockProducts.length > 5 && (
                <Badge variant="outline" className="bg-white">
                  +{lowStockProducts.length - 5} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-64">
              <Label className="mb-2 block">Filter by Location</Label>
              <select
                className="w-full h-10 px-3 border rounded-md"
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.location_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Stock Levels
            <Badge variant="secondary" className="ml-2">
              {pagination.total} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No inventory records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.inventory_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product.product_name}</div>
                        {item.product.barcode && (
                          <div className="text-xs text-gray-500">{item.product.barcode}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{item.location.location_name}</div>
                        <div className="text-xs text-gray-500">{item.location.location_type}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">{item.quantity}</TableCell>
                    <TableCell>{item.available_quantity}</TableCell>
                    <TableCell>
                      {item.is_low_stock ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Adjust Stock</h2>
              <button onClick={() => setShowAdjustModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdjust} className="p-4 space-y-4">
              <div>
                <Label>Product *</Label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={adjustData.product_id}
                  onChange={(e) => setAdjustData({ ...adjustData, product_id: e.target.value })}
                  required
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Location *</Label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={adjustData.location_id}
                  onChange={(e) => setAdjustData({ ...adjustData, location_id: e.target.value })}
                  required
                >
                  <option value="">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Adjustment Type *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={adjustData.adjustment_type}
                    onChange={(e) => setAdjustData({ ...adjustData, adjustment_type: e.target.value })}
                  >
                    <option value="add">Add Stock</option>
                    <option value="subtract">Remove Stock</option>
                    <option value="set">Set Quantity</option>
                  </select>
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={adjustData.quantity}
                    onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder="e.g., Physical count adjustment"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adjust Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Stock Transfer</h2>
              <button onClick={() => setShowTransferModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Location *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={transferData.from_location_id}
                    onChange={(e) => setTransferData({ ...transferData, from_location_id: e.target.value })}
                    required
                  >
                    <option value="">Select Source</option>
                    {locations.map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.location_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>To Location *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={transferData.to_location_id}
                    onChange={(e) => setTransferData({ ...transferData, to_location_id: e.target.value })}
                    required
                  >
                    <option value="">Select Destination</option>
                    {locations.map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.location_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Products to Transfer</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTransferItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Product
                  </Button>
                </div>
                <div className="space-y-2">
                  {transferData.items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <select
                        className="flex-1 h-10 px-3 border rounded-md"
                        value={item.product_id}
                        onChange={(e) => updateTransferItem(index, 'product_id', e.target.value)}
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.product_name}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="1"
                        className="w-24"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateTransferItem(index, 'quantity', e.target.value)}
                      />
                      {transferData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTransferItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Input
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder="Transfer notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={transferMutation.isPending}>
                  {transferMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryPage
