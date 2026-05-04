import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { skillService } from '@/services/skill.service'
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

function SkillModal({ open, onOpenChange, skill = null }) {
  const queryClient = useQueryClient()
  const isEditing = !!skill

  const [name, setName] = useState('')

  useEffect(() => {
    setName(skill?.name || '')
  }, [skill, open])

  const createMutation = useMutation({
    mutationFn: skillService.createSkill,
    onSuccess: () => {
      toast.success('Skill created')
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create skill')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => skillService.updateSkill(id, data),
    onSuccess: () => {
      toast.success('Skill updated')
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update skill')
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Skill name is required')
      return
    }
    if (isEditing) {
      updateMutation.mutate({ id: skill.id, data: { name: trimmed } })
    } else {
      createMutation.mutate({ name: trimmed })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Skill' : 'Add New Skill'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Skill Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Haircut, Beard Trim, Facial"
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Skills tag what an employee can do and what a service requires. Use any name that fits your shop.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
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

export default SkillModal
