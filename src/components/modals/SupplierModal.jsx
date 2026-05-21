import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supplierService } from '@/services/supplier.service'


export default function SupplierModal({ open, onOpenChange, editSupplier, onSuccess }) {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', 
  })

 

  useEffect(() => {
  if (editSupplier) {
    setFormData({
      name: editSupplier.name || '',
      phone: editSupplier.phone || '',
      email: editSupplier.email || '',
      address: editSupplier.address || '',
    })
  } else {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
    })
  }
}, [editSupplier, open])

  const mutation = useMutation({
    mutationFn: (data) =>
      editSupplier ? supplierService.updateSupplier(editSupplier.supplier_id, data) : supplierService.createSupplier(data),
    onSuccess: (res) => {
      toast.success(editSupplier ? 'Supplier updated' : 'Supplier created')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      onOpenChange(false)
      onSuccess?.(res?.data || res)
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed'),
  })

  const handleSubmit = () => {
    if (!formData.name.trim()) return toast.error('Name is required')
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{editSupplier ? 'Edit Supplier' : 'New Supplier'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ABC Cosmetics" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="9876543210" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="abc@example.com" />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" />
          </div>
          
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editSupplier ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
