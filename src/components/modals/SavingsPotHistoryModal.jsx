import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { savingsPotService } from '@/services/savingsPot.service'

export default function SavingsPotHistoryModal({ open, onOpenChange, pot }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['savings-pot-history', pot?.pot_id, { startDate, endDate, page }],
    queryFn: () => savingsPotService.getHistory(pot.pot_id, {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page,
      limit: 20,
    }),
    enabled: !!pot?.pot_id && open,
  })
  const history = data?.data || []
  const pagination = data?.pagination || {}

  if (!pot) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>History — {pot.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <span className="text-sm text-gray-500">Current Balance</span>
            <span className="font-semibold text-lg">{formatCurrency(pot.balance)}</span>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
            </div>
            <div className="flex-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
            </div>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}>Clear</Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No transactions found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        <Badge variant={entry.type === 'deposit' ? 'default' : 'secondary'}>
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.person_name}</TableCell>
                      <TableCell className={`text-right font-medium ${entry.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                        {entry.type === 'withdrawal' ? '-' : '+'}{formatCurrency(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.total_pages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-gray-500">Page {page} of {pagination.total_pages}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                    <Button size="sm" variant="outline" disabled={page >= pagination.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
