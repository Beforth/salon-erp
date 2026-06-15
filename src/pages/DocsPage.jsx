import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { docsService } from '@/services/docs.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Youtube,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { getYoutubeEmbedUrl } from '@/lib/utils'

const emptyForm = { title: '', youtube_link: '', description: '' }

export default function DocsPage() {
  const { user } = useSelector((state) => state.auth)
  const isOwner = user?.role === 'owner' || user?.role === 'developer'
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })

  const { data, isLoading } = useQuery({
    queryKey: ['docs'],
    queryFn: () => docsService.getDocs(),
  })
  const docs = data?.data || []

  const createMutation = useMutation({
    mutationFn: (data) => docsService.createDoc(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      toast.success('Doc created')
      closeDialog()
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => docsService.updateDoc(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      toast.success('Doc updated')
      closeDialog()
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => docsService.deleteDoc(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      toast.success('Doc deleted')
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to delete'),
  })

  function openCreate() {
    setEditingDoc(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  function openEdit(doc) {
    setEditingDoc(doc)
    setForm({
      title: doc.title || '',
      youtube_link: doc.youtube_link || '',
      description: doc.description || '',
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingDoc(null)
    setForm({ ...emptyForm })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    const payload = {
      title: form.title.trim(),
      youtube_link: form.youtube_link.trim() || null,
      description: form.description.trim() || null,
    }
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.doc_id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Docs</h1>
          <p className="text-sm text-gray-500 mt-1">Guides and tutorials on how to use the system.</p>
        </div>
        {isOwner && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Doc
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No docs yet.</p>
            {isOwner && (
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add the first doc
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {docs.map((doc) => (
            <Card key={doc.doc_id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{doc.description}</p>
                    )}
                    {doc.youtube_link && (() => {
                      const embedUrl = getYoutubeEmbedUrl(doc.youtube_link)
                      return embedUrl ? (
                        <div className="mt-2 aspect-video">
                          <iframe
                            src={embedUrl}
                            className="w-full h-full rounded-md"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={doc.title}
                          />
                        </div>
                      ) : (
                        <a
                          href={doc.youtube_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 mt-2"
                        >
                          <Youtube className="h-4 w-4" />
                          Watch on YouTube
                        </a>
                      )
                    })()}
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(doc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600"
                        onClick={() => {
                          if (window.confirm(`Delete "${doc.title}"?`)) {
                            deleteMutation.mutate(doc.doc_id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Edit Doc' : 'Add Doc'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="How to create a bill"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_link">YouTube Video Link</Label>
              <Input
                id="youtube_link"
                value={form.youtube_link}
                onChange={(e) => setForm({ ...form, youtube_link: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this guide..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingDoc ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
