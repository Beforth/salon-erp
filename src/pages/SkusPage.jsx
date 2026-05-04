import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Power, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { skuService } from '@/services/sku.service'
import SkuModal from '@/components/modals/SkuModal'

export default function SkusPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editSku, setEditSku] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['skus', { q: search }],
    queryFn: () => skuService.getSkus({ q: search || undefined }),
  })
  const skus = data?.data || []

  const deactivateMutation = useMutation({
    mutationFn: (id) => skuService.deactivateSku(id),
    onSuccess: () => {
      toast.success('SKU deactivated')
      queryClient.invalidateQueries({ queryKey: ['skus'] })
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed'),
  })
  const reactivateMutation = useMutation({
    mutationFn: (id) => skuService.updateSku(id, { is_active: true }),
    onSuccess: () => {
      toast.success('SKU reactivated')
      queryClient.invalidateQueries({ queryKey: ['skus'] })
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SKUs</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            An SKU groups product variants (e.g. "Loreal Shampoo" → 100ml, 250ml, 500ml). Each variant under it is a Product with its own barcode and price.
          </p>
        </div>
        <Button onClick={() => { setEditSku(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add SKU
        </Button>
      </div>

      <Card>
        <CardContent className="py-3 px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, code or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : skus.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              {search ? 'No SKUs match your search.' : 'No SKUs yet. Add the first one to start grouping product variants.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Variants</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{s.brand || '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-gray-500">{s.code}</TableCell>
                    <TableCell className="text-sm text-gray-600">{s.category?.name || '—'}</TableCell>
                    <TableCell className="text-center">{s.product_count}</TableCell>
                    <TableCell className="text-center">
                      {s.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditSku(s); setModalOpen(true) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {s.is_active ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => {
                              if (window.confirm(`Deactivate "${s.name}"?`)) deactivateMutation.mutate(s.id)
                            }}
                            disabled={deactivateMutation.isPending}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600"
                            onClick={() => reactivateMutation.mutate(s.id)}
                            disabled={reactivateMutation.isPending}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SkuModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditSku(null) }}
        sku={editSku}
      />
    </div>
  )
}
