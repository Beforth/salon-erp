import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { billService } from '@/services/bill.service'
import { branchService } from '@/services/branch.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

function CompletePendingServiceModal({ open, onOpenChange, item }) {
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const [selectedEmployee, setSelectedEmployee] = useState('')

  const branchId = item?.branch_id || user?.branchId
  const { data: employeesData } = useQuery({
    queryKey: ['branch-employees', branchId],
    queryFn: () => branchService.getBranchEmployees(branchId),
    enabled: open && !!branchId,
  })
  const employees = employeesData?.data || []

  useEffect(() => {
    if (open) {
      setSelectedEmployee('')
    }
  }, [open])

  const completeMutation = useMutation({
    mutationFn: () =>
      billService.completeBillItem(item.bill_id, item.item_id, {
        employee_ids: [selectedEmployee],
      }),
    onSuccess: () => {
      toast.success('Service completed successfully!')
      queryClient.invalidateQueries({ queryKey: ['pending-services'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['bill', String(item.bill_id)] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to complete service')
    },
  })

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Complete Pending Service</DialogTitle>
          <p className="text-sm text-gray-500">
            {item.bill_number} &bull; {item.customer_name || 'Customer'}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">{item.item_name}</span>
              <span className="text-sm text-gray-500">{formatCurrency(item.total_price)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Billed on {item.bill_date ? new Date(item.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Assign Employee *</Label>
            <SearchableSelect
              options={employees.map((emp) => ({ value: emp.employee_id, label: emp.full_name }))}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="Select employee..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={completeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending || !selectedEmployee}
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete Service
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompletePendingServiceModal
