import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { reportsService } from '@/services/reports.service'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTip, DataTable, Empty, ExportMenu, Kpi, Panel, ReportError, ReportLoading, compact, useChartColors } from './ReportKit'

/** Horizontal revenue bars, biggest first, with a dashed line at the average. */
function RevenueBars({ rows, color, average, avgLabel }) {
  const c = useChartColors()
  const top = rows.slice(0, 10).map((r) => ({ ...r, label: r.name.length > 22 ? `${r.name.slice(0, 21)}…` : r.name }))
  return (
    <div role="img" aria-label="Revenue by name, bar chart" style={{ height: Math.max(180, top.length * 34 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={c.border} />
          <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11, fill: c.muted }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: c.muted }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTip format={(v, k) => (k === 'revenue' ? money(v) : v)} />} />
          {average > 0 && <ReferenceLine x={average} stroke={c.warning} strokeDasharray="4 3" label={{ value: avgLabel, position: 'top', fontSize: 10, fill: c.warning }} />}
          <Bar dataKey="revenue" name="Revenue" fill={c.primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const time = (iso) => (iso ? String(iso).slice(11, 16) : '—')
const money = (n) => formatCurrency(Math.round(n || 0))
const STATUS = { present: 'Present', late: 'Late', half_day: 'Half day', absent: 'Absent', on_leave: 'On leave' }
const dayLabel = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short', timeZone: 'UTC' })

/** Everything one staff member did in the chosen range: services, products, days in/out, money. */
export default function StaffDetail({ employeeId, from, to, branchId, onBack }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hub-staff-detail', employeeId, from, to, branchId],
    queryFn: () => reportsService.hubStaffDetail(employeeId, { start_date: from, end_date: to, branch_id: branchId || undefined }).then((r) => r.data),
  })

  const back = (
    <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2"><ArrowLeft className="mr-1 h-4 w-4" />All staff</Button>
  )
  if (isLoading) return <div className="space-y-3">{back}<ReportLoading /></div>
  if (error) return <div className="space-y-3">{back}<ReportError error={error} retry={refetch} /></div>

  const { employee: e, totals: t, attendance: a } = data
  const activeDays = data.days.filter((d) => d.services || d.product_sales || d.status)
  const activityRows = data.activity.map((r) => ({ when: r.when, bill: r.bill_number, customer: r.customer, item: r.item, type: r.type, amount: r.amount, stars: r.stars, bill_id: r.bill_id }))

  return (
    <div className="space-y-4">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{e.name}</h2>
          <p className="text-sm text-muted-foreground">
            <span className="capitalize">{e.role}</span>{e.branch ? ` · ${e.branch.trim()}` : ''}{e.employee_code ? ` · code ${e.employee_code}` : ''}
            {!e.is_active ? ' · inactive' : ''}{e.combined_accounts > 1 ? ` · ${e.combined_accounts} accounts combined` : ''}
            <span className="ml-2">{data.range.from} to {data.range.to}</span>
          </p>
        </div>
        <Link to="/staff-performance" className="text-xs font-medium text-primary hover:underline">Open Staff Performance (incentives)</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Services done" value={t.services} />
        <Kpi label="Revenue credited" value={money(t.revenue)} hint="shared when two people did one service" />
        <Kpi label="Customers served" value={t.customers} />
        <Kpi label="Avg per service" value={money(t.avg_per_service)} hint={t.worked_days ? `${money(t.avg_per_day)} per working day` : undefined} />
        <Kpi label="Stars" value={t.stars} />
        <Kpi label="Products sold" value={t.product_items ? `${t.product_items} · ${money(t.product_sales)}` : '0'} hint={t.product_incentive ? `incentive ${money(t.product_incentive)}` : undefined} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Days present" value={a.present} />
        <Kpi label="Late days" value={a.late} />
        <Kpi label="Half days / absent" value={`${a.half_day} / ${a.absent}`} />
        <Kpi label="Hours worked" value={a.hours} />
        <Kpi label="Overtime hours" value={a.overtime_hours} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Service-wise revenue" subtitle="Top 10 services; dashed line is the average per service type">
          {data.by_service.length === 0 ? <Empty>No services credited in this period.</Empty> : (
            <RevenueBars rows={data.by_service} color="primary" average={data.by_service.reduce((n, r) => n + r.revenue, 0) / data.by_service.length} avgLabel="avg" />
          )}
        </Panel>
        <Panel title="Package-wise revenue" subtitle="Packages sold with this person credited">
          {data.by_package.length === 0 ? <Empty>No packages credited in this period.</Empty> : (
            <RevenueBars rows={data.by_package} average={data.by_package.reduce((n, r) => n + r.revenue, 0) / data.by_package.length} avgLabel="avg" />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="What they did, by service" subtitle="Most revenue first">
          {data.by_service.length === 0 ? <Empty>No services credited in this period.</Empty> : (
            <DataTable
              rows={data.by_service}
              rowKey={(r) => r.name}
              defaultSort={{ key: 'revenue', dir: 'desc' }}
              maxHeight="22rem"
              columns={[
                { key: 'name', label: 'Service', className: 'font-medium' },
                { key: 'count', label: 'Times', align: 'right' },
                { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => money(r.revenue) },
                { key: 'stars', label: 'Stars', align: 'right' },
              ]}
            />
          )}
        </Panel>

        <Panel title="Day by day" subtitle="Attendance and work for each day">
          {activeDays.length === 0 ? <Empty>No work or attendance recorded in this period.</Empty> : (
            <DataTable
              rows={activeDays}
              rowKey={(r) => r.date}
              defaultSort={{ key: 'date', dir: 'desc' }}
              maxHeight="22rem"
              columns={[
                { key: 'date', label: 'Day', render: (r) => dayLabel(r.date) },
                { key: 'status', label: 'Status', sortValue: (r) => r.status || '', render: (r) => (r.status ? STATUS[r.status] || r.status : '—') },
                { key: 'in_out', label: 'In – Out', sortValue: (r) => r.check_in || '', render: (r) => `${time(r.check_in)} – ${time(r.check_out)}` },
                { key: 'hours', label: 'Hours', align: 'right', render: (r) => (r.hours ? r.hours : '—') },
                { key: 'services', label: 'Services', align: 'right' },
                { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => (r.revenue ? money(r.revenue) : '—') },
              ]}
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Every item they handled"
        subtitle={data.activity_truncated ? 'Latest 1,000 shown — narrow the dates to see older ones.' : 'Newest first. Click a bill number to open it.'}
        action={<ExportMenu rows={activityRows.map(({ bill_id, ...r }) => r)} filename={`${e.name}-activity-${from}-to-${to}`} title={`${e.name} — activity`} />}
      >
        {activityRows.length === 0 ? <Empty>Nothing handled in this period.</Empty> : (
          <DataTable
            rows={activityRows}
            rowKey={(r, i) => `${r.bill_id}-${r.item}-${i}`}
            defaultSort={{ key: 'when', dir: 'desc' }}
            maxHeight="26rem"
            columns={[
              { key: 'when', label: 'When' },
              { key: 'bill', label: 'Bill', render: (r) => <Link to={`/bills/${r.bill_id}`} className="font-mono text-xs text-primary hover:underline">{r.bill}</Link> },
              { key: 'customer', label: 'Customer' },
              { key: 'item', label: 'Item', className: 'font-medium', render: (r) => <>{r.item}{r.type === 'product' && <span className="ml-1 rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">product</span>}</> },
              { key: 'amount', label: 'Credited', align: 'right', render: (r) => money(r.amount) },
              { key: 'stars', label: 'Stars', align: 'right', render: (r) => r.stars || '—' },
            ]}
          />
        )}
      </Panel>

      {data.expenses.length > 0 && (
        <Panel title="Paid out to them" subtitle="Expenses recorded against this employee (advances, salary and similar)">
          <DataTable
            rows={data.expenses}
            rowKey={(r) => r.category}
            columns={[
              { key: 'category', label: 'Category', className: 'font-medium' },
              { key: 'count', label: 'Entries', align: 'right' },
              { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
            ]}
          />
        </Panel>
      )}
    </div>
  )
}
