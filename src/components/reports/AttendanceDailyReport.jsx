import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'
import SearchBox from './SearchBox'
import { DataTable, Empty, ExportMenu, Kpi, Panel, ReportError, ReportLoading } from './ReportKit'
import { KIND_LABEL, KindBadge, MarkDayDrawer, hhmm } from './AttendanceDrawers'

/** One day, everyone. `to` is the chosen day. Click a row to correct it. */
export default function AttendanceDailyReport({ to: date, branchId }) {
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hub-attendance', 'daily', date, branchId],
    queryFn: () => reportsService.hubAttendanceDaily({ date, branch_id: branchId || undefined }).then((r) => r.data),
  })
  if (isLoading) return <ReportLoading />
  if (error) return <ReportError error={error} retry={refetch} />

  const t = data.totals
  const needle = q.trim().toLowerCase()
  const shown = needle ? data.rows.filter((r) => `${r.name} ${r.employee_code || ''}`.toLowerCase().includes(needle)) : data.rows
  const rank = { unmarked: 0, absent: 1, leave: 2, half_day: 3, present: 4 }
  const exportRows = data.rows.map((r) => ({ name: r.name, branch: r.branch || '', status: KIND_LABEL[r.kind] + (r.late ? ' (late)' : ''), check_in: hhmm(r.check_in), check_out: hhmm(r.check_out), hours: r.hours, overtime_hours: r.overtime_hours, late_fine: r.late_amount, late_hours_off: r.late_hours }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Present" value={t.present} hint={t.late ? `${t.late} of them late` : undefined} />
        <Kpi label="Half day" value={t.half_day} />
        <Kpi label="On leave" value={t.leave} />
        <Kpi label="Absent" value={t.absent} tone={t.absent ? 'text-rose-600' : ''} />
        <Kpi label="Not marked" value={t.unmarked} tone={t.unmarked ? 'text-amber-600' : ''} hint="no record yet" />
        <Kpi label="Staff" value={t.staff} />
      </div>
      <Panel
        title="Daily attendance"
        subtitle="Click a person to mark them present, absent or on leave, or to change their times."
        action={<div className="flex items-center gap-2"><SearchBox value={q} onChange={setQ} /><ExportMenu rows={exportRows} filename={`attendance-${date}`} title={`Attendance ${date}`} /></div>}
      >
        {data.rows.length === 0 ? <Empty>No staff for this branch.</Empty> : shown.length === 0 ? <Empty>No one matches "{q}".</Empty> : (
          <DataTable
            rows={shown}
            rowKey={(r) => `${r.employee_id}-${r.branch_id}`}
            onRowClick={(r) => setEdit(r)}
            defaultSort={{ key: 'kind', dir: 'asc' }}
            maxHeight="32rem"
            pageSize={50}
            columns={[
              { key: 'name', label: 'Employee', className: 'font-medium' },
              { key: 'branch', label: 'Branch', render: (r) => r.branch || '—' },
              { key: 'kind', label: 'Status', sortValue: (r) => rank[r.kind], render: (r) => <KindBadge row={r} /> },
              { key: 'check_in', label: 'In', sortValue: (r) => r.check_in || '', render: (r) => hhmm(r.check_in) || '—' },
              { key: 'check_out', label: 'Out', sortValue: (r) => r.check_out || '', render: (r) => hhmm(r.check_out) || '—' },
              { key: 'hours', label: 'Hours', align: 'right', render: (r) => (r.hours ? r.hours : '—') },
              { key: 'overtime_hours', label: 'Overtime', align: 'right', render: (r) => (r.overtime_hours ? `${r.overtime_hours} h` : '—') },
              { key: 'late_amount', label: 'Late fine', align: 'right', render: (r) => (r.late_amount ? `₹${r.late_amount}` : r.late_hours ? `${r.late_hours} h` : '—') },
            ]}
          />
        )}
      </Panel>
      {edit && <MarkDayDrawer target={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}
