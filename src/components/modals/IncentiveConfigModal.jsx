import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { incentiveService } from '@/services/incentive.service'
import { productService } from '@/services/product.service'
import { branchService } from '@/services/branch.service'

export default function IncentiveConfigModal({ open, onOpenChange, editConfig }) {
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    product_category_id: '',
    percentage: '',
    is_default: true,
    branch_id: '',
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productService.getCategories(),
  })
  const categories = categoriesData?.data || []

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
  })
  const branches = branchesData?.data || []

  useEffect(() => {
    if (editConfig) {
      setFormData({
        product_category_id: editConfig.product_category_id || '',
        percentage: editConfig.percentage || '',
        is_default: editConfig.is_default ?? true,
        branch_id: editConfig.branch_id || '',
      })
    } else {
      setFormData({
        product_category_id: '',
        percentage: '',
        is_default: true,
        branch_id: user?.branchId || '',
      })
    }
  }, [editConfig, open, user])

  const mutation = useMutation({
    mutationFn: (data) =>
      editConfig ? incentiveService.updateConfig(editConfig.config_id, data) : incentiveService.createConfig(data),
    onSuccess: () => {
      toast.success(editConfig ? 'Config updated' : 'Config created')
      queryClient.invalidateQueries({ queryKey: ['incentive-configs'] })
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed'),
  })

  const handleSubmit = () => {
    if (!formData.percentage || Number(formData.percentage) <= 0) return toast.error('Enter a valid percentage')
    const payload = {
      percentage: Number(formData.percentage),
      is_default: formData.is_default,
      branch_id: formData.branch_id || undefined,
    }
    if (!formData.is_default && formData.product_category_id) {
      payload.product_category_id = formData.product_category_id
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{editConfig ? 'Edit Incentive Rule' : 'New Incentive Rule'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked, product_category_id: '' })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is_default" className="cursor-pointer">Default (applies to all categories)</Label>
          </div>

          {!formData.is_default && (
            <div>
              <Label>Product Category</Label>
              <Select value={formData.product_category_id} onValueChange={(val) => setFormData({ ...formData, product_category_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.category_id} value={c.category_id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Percentage (%)</Label>
            <Input
              type="number"
              value={formData.percentage}
              onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
              placeholder="5"
              min="0"
              max="100"
            />
          </div>

          <div>
            <Label>Branch</Label>
            <Select value={formData.branch_id} onValueChange={(val) => setFormData({ ...formData, branch_id: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editConfig ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
