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
  services: [], // [{ service_id, service_name, quantity, service_price }]
  service_groups: [], // [{ group_label, services: [{ service_id, service_name, quantity, service_price }] }]
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

  // Calculate totals (standalone + one per OR group; individual = standalone + max per group)
  const totals = useMemo(() => {
    let individualPrice = formData.services.reduce((sum, s) => sum + (s.service_price * s.quantity), 0)
    formData.service_groups.forEach((g) => {
      const groupPrices = (g.services || []).map(s => (s.service_price || 0) * (s.quantity || 1))
      individualPrice += groupPrices.length ? Math.max(...groupPrices) : 0
    })
    const packagePrice = formData.package_price ? parseFloat(formData.package_price) : null
    const savings = packagePrice != null ? individualPrice - packagePrice : 0
    const totalServices =
      formData.services.reduce((sum, s) => sum + s.quantity, 0) + formData.service_groups.length
    return { individualPrice, savings, totalServices }
  }, [formData.services, formData.service_groups, formData.package_price])

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
        service_groups: pkg.service_groups?.map(g => ({
          group_label: g.group_label || '',
          services: (g.services || []).map(s => ({
            service_id: s.service_id,
            service_name: s.service_name,
            quantity: s.quantity,
            service_price: s.service_price,
          })),
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

  const handleUpdateServicePrice = (index, value) => {
    const num = parseFloat(value)
    if (Number.isNaN(num) || num < 0) return
    const updatedServices = [...formData.services]
    updatedServices[index].service_price = num
    handleChange('services', updatedServices)
  }

  const handleRemoveService = (index) => {
    handleChange('services', formData.services.filter((_, i) => i !== index))
  }

  // OR group handlers
  const handleAddGroup = () => {
    handleChange('service_groups', [
      ...formData.service_groups,
      { group_label: '', services: [] },
    ])
  }

  const handleRemoveGroup = (groupIndex) => {
    handleChange(
      'service_groups',
      formData.service_groups.filter((_, i) => i !== groupIndex)
    )
  }

  const handleUpdateGroupLabel = (groupIndex, value) => {
    const updated = [...formData.service_groups]
    updated[groupIndex] = { ...updated[groupIndex], group_label: value }
    handleChange('service_groups', updated)
  }

  const handleAddServiceToGroup = (groupIndex, service) => {
    const updated = [...formData.service_groups]
    const group = updated[groupIndex]
    const list = group.services || []
    const existing = list.find((s) => s.service_id === service.service_id)
    if (existing) {
      existing.quantity += 1
    } else {
      list.push({
        service_id: service.service_id,
        service_name: service.service_name,
        quantity: 1,
        service_price: service.price,
      })
    }
    updated[groupIndex] = { ...group, services: [...list] }
    handleChange('service_groups', updated)
  }

  const handleRemoveServiceFromGroup = (groupIndex, serviceIndex) => {
    const updated = [...formData.service_groups]
    const list = (updated[groupIndex].services || []).filter((_, i) => i !== serviceIndex)
    updated[groupIndex] = { ...updated[groupIndex], services: list }
    handleChange('service_groups', updated)
  }

  const handleUpdateGroupServiceQuantity = (groupIndex, serviceIndex, delta) => {
    const updated = [...formData.service_groups]
    const list = [...(updated[groupIndex].services || [])]
    list[serviceIndex] = {
      ...list[serviceIndex],
      quantity: Math.max(1, (list[serviceIndex].quantity || 1) + delta),
    }
    updated[groupIndex] = { ...updated[groupIndex], services: list }
    handleChange('service_groups', updated)
  }

  const handleUpdateGroupServicePrice = (groupIndex, serviceIndex, value) => {
    const num = parseFloat(value)
    if (Number.isNaN(num) || num < 0) return
    const updated = [...formData.service_groups]
    const list = [...(updated[groupIndex].services || [])]
    list[serviceIndex] = { ...list[serviceIndex], service_price: num }
    updated[groupIndex] = { ...updated[groupIndex], services: list }
    handleChange('service_groups', updated)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.package_name.trim()) {
      toast.error('Package name is required')
      return
    }

    const priceVal = formData.package_price ? parseFloat(formData.package_price) : null
    if (priceVal !== null && (isNaN(priceVal) || priceVal < 0)) {
      toast.error('Package price must be zero or greater')
      return
    }

    const hasStandalone = formData.services.length > 0
    const hasGroups = formData.service_groups.some((g) => (g.services || []).length > 0)
    if (!hasStandalone && !hasGroups) {
      toast.error('Add at least one service (included services or in an OR group)')
      return
    }

    const data = {
      package_name: formData.package_name.trim(),
      package_price: priceVal,
      validity_days: parseInt(formData.validity_days, 10) || 365,
      description: formData.description?.trim() || null,
      is_active: !!formData.is_active,
      services: (formData.services || []).map((s) => ({
        service_id: s.service_id,
        quantity: Number(s.quantity) || 1,
        service_price: s.service_price != null ? Number(s.service_price) : null,
      })),
      service_groups: (formData.service_groups || [])
        .filter((g) => (g.services || []).length > 0)
        .map((g) => ({
          group_label: (g.group_label || '').trim() || 'Choose one',
          services: (g.services || []).map((s) => ({
            service_id: s.service_id,
            quantity: Number(s.quantity) || 1,
            service_price: s.service_price != null ? Number(s.service_price) : null,
          })),
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
              <Label htmlFor="package_price">Package Price (₹)</Label>
              <Input
                id="package_price"
                type="number"
                min="0"
                value={formData.package_price}
                onChange={(e) => handleChange('package_price', e.target.value)}
                placeholder="Optional – uses sum of services if empty"
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

          {/* Selected Services (included in package) */}
          {formData.services.length > 0 && (
            <div className="space-y-2">
              <Label>Included Services ({formData.services.reduce((s, x) => s + x.quantity, 0)} services)</Label>
              <div className="border rounded-lg divide-y">
                {formData.services.map((service, index) => (
                  <div key={index} className="p-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{service.service_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(service.service_price)} × {service.quantity} = {formatCurrency(service.service_price * service.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-xs text-gray-500">Price (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-24 h-8 text-sm"
                          value={service.service_price}
                          onChange={(e) => handleUpdateServicePrice(index, e.target.value)}
                        />
                      </div>
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

          {/* OR groups (choose one per group) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>OR Groups (customer chooses one service per group)</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddGroup}>
                <Plus className="h-4 w-4 mr-1" />
                Add group
              </Button>
            </div>
            {formData.service_groups.map((group, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-3 space-y-2 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. Hair Color / Beard Trim / Clean Shave"
                    value={group.group_label}
                    onChange={(e) => handleUpdateGroupLabel(groupIndex, e.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(groupIndex)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                    <div key={category} className="flex flex-wrap gap-1">
                      {categoryServices.map((service) => (
                        <button
                          key={service.service_id}
                          type="button"
                          onClick={() => handleAddServiceToGroup(groupIndex, service)}
                          className="px-2 py-1 text-xs bg-white border rounded hover:bg-primary/5 hover:border-primary"
                        >
                          {service.service_name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                {(group.services || []).length > 0 && (
                  <div className="divide-y border rounded bg-white">
                    {(group.services || []).map((s, sIdx) => (
                      <div key={sIdx} className="p-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{s.service_name}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-20 h-7 text-xs"
                            value={s.service_price}
                            onChange={(e) => handleUpdateGroupServicePrice(groupIndex, sIdx, e.target.value)}
                          />
                          <div className="flex items-center border rounded">
                            <button
                              type="button"
                              onClick={() => handleUpdateGroupServiceQuantity(groupIndex, sIdx, -1)}
                              className="p-0.5 hover:bg-gray-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-1 text-xs">{s.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateGroupServiceQuantity(groupIndex, sIdx, 1)}
                              className="p-0.5 hover:bg-gray-100"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceFromGroup(groupIndex, sIdx)}
                            className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          {(formData.services.length > 0 || formData.service_groups.length > 0) && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Individual Price:</span>
                <span>{formatCurrency(totals.individualPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Package Price:</span>
                <span className="font-bold">
                  {formData.package_price ? formatCurrency(parseFloat(formData.package_price)) : '—'}
                </span>
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
