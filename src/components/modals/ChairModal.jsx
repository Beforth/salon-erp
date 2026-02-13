import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chairService } from '@/services/chair.service'
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
  chair_name: '',
  status: 'available',
}

function ChairModal({ open, onOpenChange, chair = null, branchId }) {
  const queryClient = useQueryClient()
  const isEditing = !!chair

  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    if (chair) {
      setFormData({
        chair_name: chair.chair_name || '',
        status: chair.status || 'available',
      })
    } else {
      setFormData(initialFormData)
    }
  }, [chair, open])

  const createMutation = useMutation({
    mutationFn: chairService.createChair,
    onSuccess: () => {
      toast.success('Chair created successfully')
      queryClient.invalidateQueries({ queryKey: ['chairs'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create chair')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => chairService.updateChair(id, data),
    onSuccess: () => {
      toast.success('Chair updated successfully')
      queryClient.invalidateQueries({ queryKey: ['chairs'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update chair')
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const payload = {
      ...formData,
      branch_id: branchId,
    }

    if (isEditing) {
      updateMutation.mutate({ id: chair.chair_id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Chair' : 'Add Chair'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditing && chair?.chair_number && (
            <div>
              <Label className="text-gray-500">Chair Number</Label>
              <p className="mt-1 text-sm font-mono font-medium">{chair.chair_number}</p>
            </div>
          )}

          <div>
            <Label htmlFor="chair_name">Chair Name</Label>
            <Input
              id="chair_name"
              value={formData.chair_name}
              onChange={(e) => handleChange('chair_name', e.target.value)}
              placeholder="e.g. Window Seat"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="w-full h-10 px-3 border rounded-md mt-1"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {isEditing ? 'Update Chair' : 'Save Chair'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ChairModal
