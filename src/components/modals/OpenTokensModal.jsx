import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { tokenService } from '@/services/token.service'

function OpenTokensModal({ open, onOpenChange, onPick }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tokens', { status: 'open' }],
    queryFn: () => tokenService.getOpenTokens({ status: 'open' }),
    enabled: open,
  })
  const tokens = data?.data || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Open Tokens — Today</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : tokens.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-6">No open tokens.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto divide-y">
            {tokens.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onPick(t); onOpenChange(false) }}
                className="w-full text-left px-2 py-2.5 hover:bg-gray-50 flex items-center gap-3 rounded-md"
              >
                <span className="text-lg font-bold tracking-wide text-primary w-20">
                  {t.token_number}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{t.customer_name_snap}</div>
                  {t.customer_phone_snap && (
                    <div className="text-xs text-gray-500">{t.customer_phone_snap}</div>
                  )}
                  {(t.services_requested?.length ?? 0) > 0 && (
                    <div className="text-xs text-gray-600 truncate">
                      {t.services_requested
                        .map((it) => (it.kind === 'package' ? `📦 ${it.name || it.service_name}` : (it.name || it.service_name)))
                        .join(', ')}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default OpenTokensModal
