import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseService } from '@/services/expense.service'
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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const initialFormData = {
  name: '',
  description: '',
  requires_employee: false,
}

function ExpenseCategoryModal({ open, onOpenChange, category = null }) {
  const queryClient = useQueryClient()
  const isEditing = !!category

  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        requires_employee: !!category.requires_employee,
      })
    } else {
      setFormData(initialFormData)
    }
  }, [category, open])

  const createMutation = useMutation({
    mutationFn: expenseService.createCategory,
    onSuccess: () => {
      toast.success('Category created successfully')
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create category')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => expenseService.updateCategory(id, data),
    onSuccess: () => {
      toast.success('Category updated successfully')
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update category')
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      requires_employee: formData.requires_employee,
    }

    if (isEditing) {
      updateMutation.mutate({ id: category.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Category Name *</Label>
            <Input
              id="cat-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              autoFocus
              placeholder="e.g., Petty Cash"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-description">Description</Label>
            <Input
              id="cat-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <label
            htmlFor="cat-requires-employee"
            className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-gray-50"
          >
            <input
              id="cat-requires-employee"
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={formData.requires_employee}
              onChange={(e) => handleChange('requires_employee', e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">Add employee</span>
              <span className="block text-xs text-gray-500">
                Expenses in this category ask for an employee (dropdown) when added.
              </span>
            </span>
          </label>

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

export default ExpenseCategoryModal
