import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { reportsService } from '@/services/reports.service'
import { useState } from 'react'
import { DonutChart, HorizontalBarChart, RevenueAreaChart, SimpleBarChart, SimplePieChart, TrendLineChart } from '@/components/charts'
import { DataTable, Empty, ExportMenu, Kpi, Panel, ReportError, ReportLoading, compact, shortDate } from './ReportKit'

function Seg({ value, onChange, options, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border bg-muted/50 p-0.5">
      {options.map(([k, text]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${value === k ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          {text}
        </button>
      ))}
    </div>
  )
}

/** One chart whose category (services / packages / products), measure and shape the viewer picks. */
function BreakdownChart({ data }) {
  const [cat, setCat] = useState('service')
  const [measure, setMeasure] = useState('revenue')
  const [shape, setShape] = useState('bar')
  const byDay = data.days.filter((d) => d.services || d.revenue).map((d) => ({ name: shortDate(d.date), count: d.services, revenue: Math.round(d.revenue) }))
  const all = { service: data.by_service, package: data.by_package, product: data.by_product, day: byDay }[cat]
  const ranked = cat !== 'day' // days keep their calendar order; the rest rank by the measure
  const top = (ranked ? all.slice().sort((a, b) => b[measure] - a[measure]).slice(0, 10) : all).map((r) => ({ ...r, label: r.name.length > 22 ? `${r.name.slice(0, 21)}…` : r.name }))
  const avg = all.length ? all.reduce((n, r) => n + r[measure], 0) / all.length : 0
  const fmt = (v) => (measure === 'revenue' ? money(v) : v)
  const noun = { service: 'services', package: 'packages', product: 'products', day: 'days' }[cat]
  return (
    <Panel
      title="Breakdown chart"
      subtitle={`Top 10 ${noun} by ${measure === 'revenue' ? 'revenue' : 'times done'} · average per ${cat}: ${fmt(Math.round(avg * 100) / 100)}`}
      action={
        <div className="flex flex-wrap gap-2">
          <Seg label="Category" value={cat} onChange={setCat} options={[['service', 'Services'], ['package', 'Packages'], ['product', 'Products'], ['day', 'By day']]} />
          <Seg label="Measure" value={measure} onChange={setMeasure} options={[['revenue', 'Revenue'], ['count', 'Count']]} />
          <Seg label="Chart type" value={shape} onChange={setShape} options={[['bar', 'Bars'], ['column', 'Columns'], ['donut', 'Donut'], ['pie', 'Pie'], ['area', 'Area'], ['line', 'Line']]} />
        </div>
      }
    >
      {top.length === 0 ? <Empty>No {noun} credited in this period.</Empty> : (
        <>
          {shape === 'bar' && <HorizontalBarChart data={top} dataKey={measure} nameKey="label" height={Math.max(220, top.length * 34 + 40)} format={fmt} yWidth={140} leftMargin={20} />}
          {shape === 'column' && <SimpleBarChart data={top} dataKey={measure} xKey="label" height={300} format={fmt} />}
          {shape === 'donut' && <DonutChart data={top} dataKey={measure} nameKey="label" height={300} format={fmt} />}
          {shape === 'pie' && <SimplePieChart data={top} dataKey={measure} nameKey="label" height={300} format={fmt} />}
          {shape === 'area' && <RevenueAreaChart data={top} dataKey={measure} xKey="label" height={300} format={fmt} axisFormat={compact} />}
          {shape === 'line' && <TrendLineChart data={top} lines={[{ dataKey: measure, name: measure === 'revenue' ? 'Revenue' : 'Times' }]} xKey="label" height={300} format={fmt} />}
        </>
      )}
    </Panel>
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

      <BreakdownChart data={data} />

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
