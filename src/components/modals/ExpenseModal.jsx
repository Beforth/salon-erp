import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { expenseService } from '@/services/expense.service'
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

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
]

const today = () => new Date().toISOString().split('T')[0]

const initialFormData = {
  branch_id: '',
  category_id: '',
  amount: '',
  expense_date: today(),
  payment_mode: '',
  employee_id: '',
  vendor_name: '',
  description: '',
  notes: '',
}

function ExpenseModal({ open, onOpenChange, expense = null }) {
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const isOwner = user?.role === 'owner' || user?.role === 'developer'
  const isEditing = !!expense

  const [formData, setFormData] = useState(initialFormData)

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getCategories,
    enabled: open,
  })
  const categories = (categoriesData?.data || []).filter((c) => c.is_active)

  // Fetch branches (owner only)
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
    enabled: open && isOwner,
  })
  const branches = branchesData?.data || []

  // Detect Staff Advance category
  const selectedCategory = categories.find((c) => c.id === formData.category_id)
  const isStaffRelated = selectedCategory?.name === 'Staff Advance' || selectedCategory?.name === 'Staff Salary'

  // Fetch employees when Staff Advance selected
  const branchIdForEmployees = formData.branch_id || user?.branchId
  const { data: employeesData } = useQuery({
    queryKey: ['branch-employees', branchIdForEmployees],
    queryFn: () => branchService.getBranchEmployees(branchIdForEmployees),
    enabled: open && isStaffRelated && !!branchIdForEmployees,
  })
  const employees = employeesData?.data || []

  useEffect(() => {
    if (expense) {
      setFormData({
        branch_id: expense.branch_id || '',
        category_id: expense.category_id || '',
        amount: expense.amount?.toString() || '',
        expense_date: expense.expense_date
          ? new Date(expense.expense_date).toISOString().split('T')[0]
          : today(),
        payment_mode: expense.payment_mode || '',
        employee_id: expense.employee_id || '',
        vendor_name: expense.vendor_name || '',
        description: expense.description || '',
        notes: expense.notes || '',
      })
    } else {
      setFormData({
        ...initialFormData,
        branch_id: isOwner ? '' : (user?.branchId || ''),
        expense_date: today(),
      })
    }
  }, [expense, open, isOwner, user?.branchId])

  // Clear employee when category changes away from Staff Advance
  useEffect(() => {
    if (!isStaffRelated && formData.employee_id) {
      setFormData((prev) => ({ ...prev, employee_id: '' }))
    }
  }, [isStaffRelated])

  const createMutation = useMutation({
    mutationFn: expenseService.createExpense,
    onSuccess: () => {
      toast.success('Expense created successfully')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create expense')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => expenseService.updateExpense(id, data),
    onSuccess: () => {
      toast.success('Expense updated successfully')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update expense')
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const branchId = formData.branch_id || user?.branchId
    if (!branchId) {
      toast.error('Branch is required')
      return
    }
    if (!formData.category_id) {
      toast.error('Category is required')
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    if (!formData.expense_date) {
      toast.error('Expense date is required')
      return
    }
    if (!formData.payment_mode) {
      toast.error('Payment mode is required')
      return
    }

    const data = {
      branch_id: branchId,
      category_id: formData.category_id,
      amount: parseFloat(formData.amount),
      expense_date: formData.expense_date,
      payment_mode: formData.payment_mode,
      employee_id: formData.employee_id || null,
      vendor_name: formData.vendor_name.trim() || null,
      description: formData.description.trim() || null,
      notes: formData.notes.trim() || null,
    }

    if (isEditing) {
      updateMutation.mutate({ id: expense.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch (owner selects, others auto-filled) */}
          {isOwner ? (
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select
                value={formData.branch_id}
                onValueChange={(value) => handleChange('branch_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={b.branch_id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input value={user?.branchName || 'Your Branch'} disabled />
            </div>
          )}

          {/* Category + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => handleChange('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Amount *</Label>
              <Input
                id="exp-amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Date + Payment Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exp-date">Expense Date *</Label>
              <Input
                id="exp-date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => handleChange('expense_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode *</Label>
              <Select
                value={formData.payment_mode}
                onValueChange={(value) => handleChange('payment_mode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employee (only for Staff Advance) */}
          {isStaffRelated && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => handleChange('employee_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Vendor Name */}
          <div className="space-y-2">
            <Label htmlFor="exp-vendor">Vendor Name</Label>
            <Input
              id="exp-vendor"
              value={formData.vendor_name}
              onChange={(e) => handleChange('vendor_name', e.target.value)}
              placeholder="Vendor or supplier name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="exp-desc">Description</Label>
            <Input
              id="exp-desc"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="What is this expense for?"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="exp-notes">Notes</Label>
            <Input
              id="exp-notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes"
            />
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
              {isEditing ? 'Update Expense' : 'Create Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ExpenseModal
