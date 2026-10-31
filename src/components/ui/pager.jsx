import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Client-side paging for long in-memory lists. Resets to page 1 when the list changes. */
export function usePaged(items, pageSize = 25) {
  const [page, setPage] = useState(1)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => { setPage(1) }, [total, pageSize])
  const current = Math.min(page, totalPages)
  const start = (current - 1) * pageSize
  return { pageItems: items.slice(start, start + pageSize), page: current, setPage, totalPages, total, start, pageSize }
}

/** Prev/next bar; renders nothing when everything fits on one page. */
export function Pager({ page, totalPages, total, start, pageSize, setPage, className = '' }) {
  if (totalPages <= 1) return null
  const from = start + 1
  const to = Math.min(start + pageSize, total)
  return (
    <div className={`flex items-center justify-between gap-2 pt-2 text-sm ${className}`}>
      <span className="text-muted-foreground">{from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums text-muted-foreground">Page {page} of {totalPages}</span>
        <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/** Drop-in for `{items.map(render)}` inside a <tbody>: renders one page of rows plus a pager row. */
export function PagedBody({ items, children, colSpan = 99, pageSize = 25 }) {
  const paged = usePaged(items || [], pageSize)
  return (
    <>
      {paged.pageItems.map((item, i) => children(item, paged.start + i))}
      {paged.totalPages > 1 && (
        <tr>
          <td colSpan={colSpan} className="px-3 pb-2"><Pager {...paged} /></td>
        </tr>
      )}
    </>
  )
}
