import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceService } from '@/services/service.service'
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
  price: '',
  duration_minutes: '',
  star_points: '',
  description: '',
  is_multi_employee: false,
  employee_count: null,
  is_active: true,
}

function ServiceModal({ open, onOpenChange, service = null }) {
  const queryClient = useQueryClient()
  const isEditing = !!service

  const [formData, setFormData] = useState(initialFormData)

  // When editing, fetch full service details so form has is_multi_employee, employee_count, etc.
  const { data: serviceDetailsResponse, isLoading: isLoadingServiceDetails } = useQuery({
    queryKey: ['service', service?.service_id],
    queryFn: () => serviceService.getServiceById(service.service_id),
    enabled: open && !!service?.service_id,
  })
  const serviceDetails = serviceDetailsResponse?.data

  // Use fetched details when editing (so type field is populated); otherwise use list item or null
  const serviceForForm = isEditing && serviceDetails ? serviceDetails : service

  // Fetch categories when modal is open
  const { data: categoriesData } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => serviceService.getCategories(),
    enabled: open,
  })

  const categories = categoriesData?.data || []

  useEffect(() => {
    if (serviceForForm) {
      setFormData({
        service_name: serviceForForm.service_name || '',
        category_id: serviceForForm.category?.category_id || '',
        price: serviceForForm.price?.toString() ?? '',
        duration_minutes: serviceForForm.duration_minutes?.toString() ?? '',
        star_points: serviceForForm.star_points?.toString() ?? '',
        description: serviceForForm.description || '',
        is_multi_employee: serviceForForm.is_multi_employee === true,
        employee_count: serviceForForm.employee_count ?? null,
        is_active: serviceForForm.is_active ?? true,
      })
    } else {
      setFormData({ ...initialFormData })
    }
  }, [serviceForForm, open])

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

    if (formData.is_multi_employee && (!formData.employee_count || formData.employee_count < 2)) {
      toast.error('Number of employees must be at least 2 for multiple-employee services')
      return
    }

    const data = {
      service_name: formData.service_name,
      category_id: formData.category_id || null,
      price: parseFloat(formData.price),
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes, 10) : null,
      star_points: Math.max(0, parseInt(formData.star_points, 10) || 0) || 0,
      description: formData.description || null,
      is_multi_employee: !!(formData.is_multi_employee),
      employee_count: formData.is_multi_employee && formData.employee_count ? parseInt(formData.employee_count, 10) : null,
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

        {isEditing && isLoadingServiceDetails ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Single vs Multiple Employee */}
          <div className="space-y-2">
            <Label>Employee Type</Label>
            <Select
              value={formData.is_multi_employee ? 'multiple' : 'single'}
              onValueChange={(value) => {
                const isMulti = value === 'multiple'
                handleChange('is_multi_employee', isMulti)
                if (!isMulti) handleChange('employee_count', null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single employee (one staff does this service)</SelectItem>
                <SelectItem value="multiple">Multiple employees (can be done by multiple staff)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.is_multi_employee && (
            <div className="space-y-2">
              <Label htmlFor="employee_count">Number of employees</Label>
              <Input
                id="employee_count"
                type="number"
                min={2}
                max={20}
                value={formData.employee_count ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  handleChange('employee_count', v === '' ? null : (parseInt(v, 10) || null))
                }}
                placeholder="e.g. 2"
              />
            </div>
          )}

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
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ServiceModal
