import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { formatCurrency } from '@/lib/utils'
import {
  Plus,
  Search,
  Package,
  Loader2,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  ScanLine,
  Printer,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanBarcode, setScanBarcode] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [formData, setFormData] = useState({
    product_name: '',
    brand: '',
    category_id: '',
    barcode: '',
    sku: '',
    mrp: '',
    selling_price: '',
    cost_price: '',
    product_type: 'retail',
    reorder_level: 10,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search }],
    queryFn: () => productService.getProducts({ page, limit: 20, search }),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productService.getCategories(),
  })

  const products = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const categories = categoriesData?.data || []

  const createMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: () => {
      toast.success('Product created successfully')
      queryClient.invalidateQueries(['products'])
      closeModal()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create product')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productService.updateProduct(id, data),
    onSuccess: () => {
      toast.success('Product updated successfully')
      queryClient.invalidateQueries(['products'])
      closeModal()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update product')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted successfully')
      queryClient.invalidateQueries(['products'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete product')
    },
  })

  const handlePrintBarcodes = () => {
    const selected = products.filter((p) => selectedIds.has(p.product_id))
    if (selected.length === 0) return toast.error('No products selected')

    const labelHtml = selected.map((p) => `
      <div style="border:1px dashed #ccc;padding:8px;margin:4px;display:inline-block;text-align:center;font-family:monospace;">
        <div style="font-size:12px;font-weight:bold;">${p.product_name}</div>
        ${p.barcode ? `<div style="font-size:18px;letter-spacing:3px;margin:4px 0;">${p.barcode}</div>` : ''}
        <div style="font-size:11px;">${formatCurrency(p.selling_price || p.mrp)}</div>
      </div>
    `).join('')

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Barcodes</title>
      <style>@page{margin:5mm}body{font-family:monospace;}</style>
      </head><body>${labelHtml}</body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
  }

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        product_name: product.product_name,
        brand: product.brand || '',
        category_id: product.category?.category_id || '',
        barcode: product.barcode || '',
        sku: product.sku || '',
        mrp: product.mrp || '',
        selling_price: product.selling_price || '',
        cost_price: product.cost_price || '',
        product_type: product.product_type,
        reorder_level: product.reorder_level || 10,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        product_name: '',
        brand: '',
        category_id: '',
        barcode: '',
        sku: '',
        mrp: '',
        selling_price: '',
        cost_price: '',
        product_type: 'retail',
        reorder_level: 10,
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      mrp: formData.mrp ? parseFloat(formData.mrp) : null,
      selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      reorder_level: parseInt(formData.reorder_level) || 10,
      category_id: formData.category_id || null,
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.product_id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScanModalOpen(true)}>
            <ScanLine className="h-4 w-4 mr-2" />
            Scan
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={() => handlePrintBarcodes()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Barcodes ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Catalog
            <Badge variant="secondary" className="ml-2">
              {pagination.total} products
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No products found. Add your first product!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && products.every((p) => selectedIds.has(p.product_id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(products.map((p) => p.product_id)))
                        } else {
                          setSelectedIds(new Set())
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.product_id)}
                        onChange={(e) => {
                          const updated = new Set(selectedIds)
                          if (e.target.checked) updated.add(product.product_id)
                          else updated.delete(product.product_id)
                          setSelectedIds(updated)
                        }}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.product_name}</div>
                        {product.barcode && (
                          <div className="text-xs text-gray-500">
                            {product.barcode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.category?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={product.product_type === 'retail' ? 'default' : 'secondary'}>
                        {product.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold">
                        {formatCurrency(product.selling_price || product.mrp)}
                      </div>
                      {product.cost_price && (
                        <div className="text-xs text-gray-500">
                          Cost: {formatCurrency(product.cost_price)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={product.is_low_stock ? 'text-red-500 font-bold' : ''}>
                          {product.total_stock}
                        </span>
                        {product.is_low_stock && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'success' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this product?')) {
                            deleteMutation.mutate(product.product_id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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

      {/* Scan Barcode Modal */}
      <Dialog open={scanModalOpen} onOpenChange={(open) => { setScanModalOpen(open); if (!open) { setScanBarcode(''); setScanResult(null) } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              autoFocus
              placeholder="Scan or type barcode..."
              value={scanBarcode}
              onChange={(e) => setScanBarcode(e.target.value)}
              className="font-mono"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && scanBarcode.trim()) {
                  setScanLoading(true)
                  setScanResult(null)
                  try {
                    const res = await productService.getByBarcode(scanBarcode.trim())
                    setScanResult(res?.data || res)
                  } catch {
                    setScanResult(null)
                    toast.error('Product not found')
                  }
                  setScanLoading(false)
                }
              }}
            />
            {scanLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            {scanResult && (
              <Card>
                <CardContent className="py-3">
                  <div className="font-medium text-lg">{scanResult.product_name || scanResult.name}</div>
                  {scanResult.barcode && <div className="text-sm text-gray-500 font-mono">{scanResult.barcode}</div>}
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>Price: <span className="font-semibold">{formatCurrency(scanResult.selling_price || scanResult.mrp)}</span></span>
                    <span>Stock: <span className="font-semibold">{scanResult.total_stock ?? '—'}</span></span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={closeModal}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Barcode</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>MRP</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Selling Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cost Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Type *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                    required
                  >
                    <option value="retail">Retail (for sale)</option>
                    <option value="consumption">Consumption (internal use)</option>
                  </select>
                </div>
                <div>
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingProduct ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
