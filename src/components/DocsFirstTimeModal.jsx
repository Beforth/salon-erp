import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { docsService } from '@/services/docs.service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Youtube, Loader2, BookOpen } from 'lucide-react'
import { getYoutubeEmbedUrl } from '@/lib/utils'

const STORAGE_KEY = 'salon_docs_seen'

export default function DocsFirstTimeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      setOpen(true)
    }
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['docs'],
    queryFn: () => docsService.getDocs(),
    enabled: open,
  })
  const docs = data?.data || []

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Welcome! Here are some guides to get started
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No guides available yet. Check back later!
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {docs.map((doc) => (
              <div key={doc.doc_id} className="border rounded-lg p-3">
                <h4 className="font-medium text-sm text-gray-900">{doc.title}</h4>
                {doc.description && (
                  <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
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
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 mt-1.5"
                    >
                      <Youtube className="h-3.5 w-3.5" />
                      Watch on YouTube
                    </a>
                  )
                })()}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleClose}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
