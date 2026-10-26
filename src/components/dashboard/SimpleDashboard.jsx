import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Clock, FileText, PackagePlus, Plus, UserCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { billService } from '@/services/bill.service'
import { istTodayStr } from '@/components/reports/reportRange'

const SHORTCUTS = [
  { label: 'Bills', to: '/bills', icon: FileText },
  { label: 'Pending services', to: '/bills?view=pending-services', icon: Clock },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'Employee status', to: '/employee-status', icon: UserCheck },
  { label: 'Tokens', to: '/tokens', icon: PackagePlus },
  { label: 'Attendance', to: '/attendance', icon: CalendarCheck },
]

/** Dashboard for manager and cashier: counts and shortcuts only, no money anywhere. */
export default function SimpleDashboard({ fallbackName }) {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const today = istTodayStr()

  // Only the bill count is used from the summary; amounts are never shown.
  const { data: billsData } = useQuery({
    queryKey: ['simple-dashboard', 'bills-today', today],
    queryFn: () => billService.getBills({ limit: 1, start_date: today, end_date: today, exclude_cancelled: 'true' }),
  })
  const { data: pendingData } = useQuery({
    queryKey: ['simple-dashboard', 'pending-services'],
    queryFn: () => billService.getPendingServices({ limit: 1 }),
  })
  const billsToday = billsData?.meta?.summary?.count
  const pending = pendingData?.pagination?.total

  const stats = [
    { name: 'Bills today', value: billsToday, icon: FileText, to: `/bills?from=${today}&to=${today}` },
    { name: 'Pending services', value: pending, icon: Clock, to: '/bills?view=pending-services' },
  ]

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hello, {user?.fullName || fallbackName}</h1>
          <p className="text-muted-foreground">{user?.branch?.name || 'Branch'}</p>
        </div>
        <Button size="lg" onClick={() => navigate('/bills/new')}>
          <Plus className="mr-2 h-5 w-5" />
          New bill
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <Card key={s.name} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => navigate(s.to)}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{s.name}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{s.value ?? '–'}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Card key={s.label} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => navigate(s.to)}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className="h-5 w-5 text-primary" />
              <span className="font-medium">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
