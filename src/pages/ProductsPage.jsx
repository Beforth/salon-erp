import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { productService } from '@/services/product.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  ScanLine,
  Printer,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

function ProductsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const canManageProducts = ['owner', 'developer', 'manager', 'cashier'].includes(user?.role)
  const canDelete = user?.role === 'owner' || user?.role === 'developer'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanBarcode, setScanBarcode] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search }],
    queryFn: () => productService.getProducts({ page, limit: 20, search }),
  })

  const products = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">Manage your product catalog</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
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
        </CardContent>
      </Card>

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
              <p>No products found.</p>
              <Button className="mt-4" onClick={() => navigate('/products/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
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
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Barcode</TableHead>
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
                          const next = new Set(selectedIds)
                          if (e.target.checked) next.add(product.product_id)
                          else next.delete(product.product_id)
                          setSelectedIds(next)
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{product.product_name}</div>
                      {product.parent_sku?.name && (
                        <div className="text-xs text-gray-500">{product.parent_sku.name}</div>
                      )}
                      <Badge variant={product.product_type === 'retail' ? 'default' : 'secondary'} className="mt-1 text-[10px]">
                        {product.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.barcode || <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <div>{formatCurrency(product.selling_price || product.mrp)}</div>
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
                      {canManageProducts && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/products/${product.product_id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

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
                  {canManageProducts && scanResult.product_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        setScanModalOpen(false)
                        navigate(`/products/${scanResult.product_id}/edit`)
                      }}
                    >
                      Edit product
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductsPage
