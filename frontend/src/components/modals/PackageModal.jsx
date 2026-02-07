import { useState, useEffect, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Minus, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

const initialFormData = {
  package_name: '',
  package_price: '',
  validity_days: '365',
  description: '',
  is_active: true,
  services: [], // [{ service_id, quantity, service_price }]
}

function PackageModal({ open, onOpenChange, pkg = null }) {
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const userBranchId = user?.branchId || null
  const isEditing = !!pkg

  const [formData, setFormData] = useState(initialFormData)
  const [selectedBranch, setSelectedBranch] = useState(userBranchId || '')

  // Fetch branches for owner
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
    enabled: !userBranchId && open,
  })

  // Fetch services for selected branch
  const { data: servicesData } = useQuery({
    queryKey: ['services', 'active', selectedBranch || userBranchId],
    queryFn: () => serviceService.getServices({
      is_active: 'true',
      branch_id: selectedBranch || userBranchId
    }),
    enabled: open && !!(selectedBranch || userBranchId),
  })

  const branches = branchesData?.data || []
  const services = servicesData?.data || []

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped = {}
    services.forEach((service) => {
      const categoryName = service.category?.category_name || 'Other'
      if (!grouped[categoryName]) {
        grouped[categoryName] = []
      }
      grouped[categoryName].push(service)
    })
    return grouped
  }, [services])

  // Calculate totals
  const totals = useMemo(() => {
    const individualPrice = formData.services.reduce((sum, s) => {
      return sum + (s.service_price * s.quantity)
    }, 0)
    const packagePrice = parseFloat(formData.package_price) || 0
    const savings = individualPrice - packagePrice
    const totalServices = formData.services.reduce((sum, s) => sum + s.quantity, 0)
    return { individualPrice, savings, totalServices }
  }, [formData.services, formData.package_price])

  useEffect(() => {
    if (pkg) {
      setFormData({
        package_name: pkg.package_name || '',
        package_price: pkg.package_price?.toString() || '',
        validity_days: pkg.validity_days?.toString() || '365',
        description: pkg.description || '',
        is_active: pkg.is_active ?? true,
        services: pkg.services?.map(s => ({
          service_id: s.service_id,
          service_name: s.service_name,
          quantity: s.quantity,
          service_price: s.service_price,
        })) || [],
      })
    } else {
      setFormData(initialFormData)
    }
  }, [pkg, open])

  const createMutation = useMutation({
    mutationFn: serviceService.createPackage,
    onSuccess: () => {
      toast.success('Package created successfully')
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create package')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => serviceService.updatePackage(id, data),
    onSuccess: () => {
      toast.success('Package updated successfully')
      queryClient.invalidateQueries({ queryKey: ['packages'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update package')
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddService = (service) => {
    const existingIndex = formData.services.findIndex(s => s.service_id === service.service_id)
    if (existingIndex >= 0) {
      // Increment quantity
      const updatedServices = [...formData.services]
      updatedServices[existingIndex].quantity += 1
      handleChange('services', updatedServices)
    } else {
      handleChange('services', [
        ...formData.services,
        {
          service_id: service.service_id,
          service_name: service.service_name,
          quantity: 1,
          service_price: service.price,
        }
      ])
    }
  }

  const handleUpdateQuantity = (index, delta) => {
    const updatedServices = [...formData.services]
    updatedServices[index].quantity = Math.max(1, updatedServices[index].quantity + delta)
    handleChange('services', updatedServices)
  }

  const handleRemoveService = (index) => {
    handleChange('services', formData.services.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.package_name.trim()) {
      toast.error('Package name is required')
      return
    }

    if (!formData.package_price || parseFloat(formData.package_price) < 0) {
      toast.error('Valid package price is required')
      return
    }

    if (formData.services.length === 0) {
      toast.error('Add at least one service to the package')
      return
    }

    const data = {
      package_name: formData.package_name,
      package_price: parseFloat(formData.package_price),
      validity_days: parseInt(formData.validity_days) || 365,
      description: formData.description || null,
      is_active: formData.is_active,
      services: formData.services.map(s => ({
        service_id: s.service_id,
        quantity: s.quantity,
        service_price: s.service_price,
      })),
    }

    if (isEditing) {
      updateMutation.mutate({ id: pkg.package_id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? 'Edit Package' : 'Create New Package'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branch selector for owners */}
          {!userBranchId && (
            <div className="space-y-2">
              <Label>Select Branch for Services</Label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
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

          {/* Package Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="package_name">Package Name *</Label>
              <Input
                id="package_name"
                value={formData.package_name}
                onChange={(e) => handleChange('package_name', e.target.value)}
                placeholder="e.g., Bridal Package"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package_price">Package Price (₹) *</Label>
              <Input
                id="package_price"
                type="number"
                min="0"
                value={formData.package_price}
                onChange={(e) => handleChange('package_price', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validity_days">Validity (Days)</Label>
              <Input
                id="validity_days"
                type="number"
                min="1"
                value={formData.validity_days}
                onChange={(e) => handleChange('validity_days', e.target.value)}
                placeholder="365"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Package description"
              />
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label>Add Services</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
              {Object.entries(servicesByCategory).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {selectedBranch || userBranchId
                    ? 'No services available'
                    : 'Select a branch to see services'}
                </p>
              ) : (
                Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                  <div key={category} className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {categoryServices.map((service) => (
                        <button
                          key={service.service_id}
                          type="button"
                          onClick={() => handleAddService(service)}
                          className="px-2 py-1 text-xs bg-white border rounded hover:bg-primary/5 hover:border-primary transition-colors"
                        >
                          {service.service_name} - {formatCurrency(service.price)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Services */}
          {formData.services.length > 0 && (
            <div className="space-y-2">
              <Label>Package Services ({totals.totalServices} services)</Label>
              <div className="border rounded-lg divide-y">
                {formData.services.map((service, index) => (
                  <div key={index} className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{service.service_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(service.service_price)} × {service.quantity} = {formatCurrency(service.service_price * service.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(index, -1)}
                          className="p-1 hover:bg-gray-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-sm">{service.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(index, 1)}
                          className="p-1 hover:bg-gray-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {formData.services.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Individual Price:</span>
                <span>{formatCurrency(totals.individualPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Package Price:</span>
                <span className="font-bold">{formatCurrency(parseFloat(formData.package_price) || 0)}</span>
              </div>
              {totals.savings > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Customer Savings:</span>
                  <span className="font-bold">{formatCurrency(totals.savings)}</span>
                </div>
              )}
            </div>
          )}

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
              Package is active
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
              {isEditing ? 'Update Package' : 'Create Package'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PackageModal
