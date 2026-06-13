import { useQuery } from '@tanstack/react-query'
import {
  Loader2,
  RefreshCw,
  Users,
  ArrowRight,
  Coffee,
  Clock,
  AlertCircle,
  ListOrdered,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { rotationQueueService } from '@/services/rotationQueue.service'

const STATUS = {
  available: { label: 'Ready', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  held: { label: 'In cart', tone: 'bg-violet-100 text-violet-800 border-violet-200' },
  busy: { label: 'Busy', tone: 'bg-orange-100 text-orange-800 border-orange-200' },
  on_break: { label: 'Break', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
}

function formatCheckIn(checkIn) {
  if (!checkIn) return null
  return new Date(checkIn).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function StatusBadge({ displayStatus }) {
  const cfg = STATUS[displayStatus] || STATUS.available
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.tone}`}>
      {cfg.label}
    </span>
  )
}

function QueueRow({ row, highlight = false, showSkills = true }) {
  const displayStatus = row.display_status || row.status
  const skipped =
    row.status === 'available'
    && displayStatus !== 'available'
    && displayStatus !== 'held'

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
        highlight
          ? 'border-emerald-400 bg-emerald-50 shadow-sm ring-1 ring-emerald-200'
          : skipped
            ? 'border-gray-100 bg-gray-50 opacity-60'
            : 'border-gray-200 bg-white'
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          highlight ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {row.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{row.full_name}</span>
          {highlight && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] shrink-0">Next</Badge>
          )}
        </div>
        <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 items-center mt-0.5">
          {row.check_in_at && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              In {formatCheckIn(row.check_in_at)}
            </span>
          )}
          {showSkills && row.skill_names?.length > 0 && (
            <span className="truncate">{row.skill_names.join(' · ')}</span>
          )}
        </div>
      </div>
      <StatusBadge displayStatus={displayStatus} />
    </div>
  )
}

/**
 * Check-in order rotation queue for billing (B → E → C).
 * Pending cart assignments show as "held" and are skipped for "next up".
 */
export default function EmployeeRotationPanel({
  branchId,
  serviceId,
  serviceName,
  heldEmployeeIds = [],
  compact = false,
}) {
  const heldKey = heldEmployeeIds.join(',')

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['rotation-queue', branchId, serviceId || null, heldKey],
    queryFn: async () => {
      const res = await rotationQueueService.getQueue({
        branchId,
        heldEmployeeIds,
      })
      return res?.data?.data || res?.data || res
    },
    enabled: !!branchId,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  if (!branchId) return null

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-slate-50 p-4 flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading rotation queue…
      </div>
    )
  }

  const board = data || {}
  const queue = board.queue || []
  const summary = board.summary || {}
  const nextUp = board.next_up
  const visibleLimit = compact ? 5 : 8

  return (
    <div className={`rounded-lg border bg-gradient-to-br from-slate-50 to-white ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-sm text-gray-900">
            <ListOrdered className="h-4 w-4 text-primary" />
            Check-in queue
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {serviceId ? (
              <>
                Next eligible for{' '}
                <span className="font-medium text-gray-700">{serviceName || 'service'}</span>
                {' '}— walk queue in check-in order, skip if missing skills
              </>
            ) : (
              'Staff order by arrival today — first checked in is first up'
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs shrink-0"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-emerald-700 bg-white/80 px-2 py-0.5 rounded border">
          Ready: <strong>{summary.available ?? 0}</strong>
        </span>
        {(summary.held ?? 0) > 0 && (
          <span className="text-violet-700 bg-white/80 px-2 py-0.5 rounded border">
            In cart: <strong>{summary.held}</strong>
          </span>
        )}
        <span className="text-orange-700 bg-white/80 px-2 py-0.5 rounded border">
          Busy: <strong>{summary.busy ?? 0}</strong>
        </span>
        <span className="text-amber-700 bg-white/80 px-2 py-0.5 rounded border">
          Break: <strong>{summary.on_break ?? 0}</strong>
        </span>
      </div>

      {serviceId && nextUp && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-emerald-700">
            <Users className="h-3 w-3" />
            Next up
            <ArrowRight className="h-3 w-3" />
          </div>
          <QueueRow row={nextUp} highlight />
        </div>
      )}

      {serviceId && !nextUp && queue.length > 0 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          No one in queue matches this service&apos;s skills — assign manually or wait.
        </div>
      )}

      {queue.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
            {serviceId ? 'Full queue (check-in order)' : 'On floor today'}
          </div>
          {queue.slice(0, visibleLimit).map((row) => (
            <QueueRow
              key={row.employee_id}
              row={row}
              highlight={!serviceId && row.is_next}
              showSkills={!compact}
            />
          ))}
          {queue.length > visibleLimit && (
            <p className="text-[10px] text-gray-400 text-center">
              +{queue.length - visibleLimit} more
            </p>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500 text-center py-2 flex items-center justify-center gap-1">
          <Coffee className="h-3.5 w-3.5" />
          No checked-in staff on the queue yet.
        </div>
      )}

      {dataUpdatedAt > 0 && (
        <p className="text-[10px] text-gray-400 text-right">
          Updated{' '}
          {new Date(dataUpdatedAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </p>
      )}
    </div>
  )
}
