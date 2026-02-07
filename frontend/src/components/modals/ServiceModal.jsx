import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { serviceService } from '@/services/service.service'
import { branchService } from '@/services/branch.service'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const initialFormData = {
  service_name: '',
  category_id: '',
  branch_id: '',
  price: '',
  duration_minutes: '',
  star_points: '',
  description: '',
  is_active: true,
}

function ServiceModal({ open, onOpenChange, service = null }) {
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const userBranchId = user?.branchId || null
  const isEditing = !!service

  const [formData, setFormData] = useState(initialFormData)

  // Fetch branches for owner
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
    enabled: !userBranchId && open,
  })

  // Fetch categories based on selected branch
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', formData.branch_id || userBranchId],
    queryFn: () => serviceService.getCategories({ branch_id: formData.branch_id || userBranchId }),
    enabled: open && !!(formData.branch_id || userBranchId),
  })

  const branches = branchesData?.data || []
  const categories = categoriesData?.data || []

  useEffect(() => {
    if (service) {
      setFormData({
        service_name: service.service_name || '',
        category_id: service.category?.category_id || '',
        branch_id: service.branch_id || userBranchId || '',
        price: service.price?.toString() || '',
        duration_minutes: service.duration_minutes?.toString() || '',
        star_points: service.star_points?.toString() || '',
        description: service.description || '',
        is_active: service.is_active ?? true,
      })
    } else {
      setFormData({
        ...initialFormData,
        branch_id: userBranchId || '',
      })
    }
  }, [service, open, userBranchId])

  const createMutation = useMutation({
    mutationFn: serviceService.createService,
    onSuccess: () => {
      toast.success('Service created successfully')
      queryClient.invalidateQueries({ queryKey: ['services'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create service')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => serviceService.updateService(id, data),
    onSuccess: () => {
      toast.success('Service updated successfully')
      queryClient.invalidateQueries({ queryKey: ['services'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update service')
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.service_name.trim()) {
      toast.error('Service name is required')
      return
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      toast.error('Valid price is required')
      return
    }

    if (!formData.branch_id && !userBranchId) {
      toast.error('Please select a branch')
      return
    }

    const data = {
      service_name: formData.service_name,
      category_id: formData.category_id || null,
      branch_id: formData.branch_id || userBranchId,
      price: parseFloat(formData.price),
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      star_points: formData.star_points ? parseInt(formData.star_points) : 0,
      description: formData.description || null,
      is_active: formData.is_active,
    }

    if (isEditing) {
      updateMutation.mutate({ id: service.service_id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Service' : 'Add New Service'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch (for owner only) */}
          {!userBranchId && (
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select
                value={formData.branch_id}
                onValueChange={(value) => {
                  handleChange('branch_id', value)
                  handleChange('category_id', '') // Reset category when branch changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.branch_id} value={branch.branch_id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Service Name */}
          <div className="space-y-2">
            <Label htmlFor="service_name">Service Name *</Label>
            <Input
              id="service_name"
              value={formData.service_name}
              onChange={(e) => handleChange('service_name', e.target.value)}
              placeholder="e.g., Haircut, Facial"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => handleChange('category_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (mins)</Label>
              <Input
                id="duration_minutes"
                type="number"
                min="0"
                value={formData.duration_minutes}
                onChange={(e) => handleChange('duration_minutes', e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          {/* Star Points */}
          <div className="space-y-2">
            <Label htmlFor="star_points">Star Points</Label>
            <Input
              id="star_points"
              type="number"
              min="0"
              value={formData.star_points}
              onChange={(e) => handleChange('star_points', e.target.value)}
              placeholder="Points earned by customer"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Service description"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_active" className="font-normal">
              Service is active
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ServiceModal
