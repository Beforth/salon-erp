import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Receipt,
  Plus,
  Clock,
  DollarSign,
} from 'lucide-react'

const todayStats = [
  {
    name: 'Bills Created',
    value: '48',
    icon: Receipt,
  },
  {
    name: 'Pending',
    value: '3',
    icon: Clock,
  },
]

const recentBills = [
  { id: 'SB001-2026-000542', customer: 'Raj Kumar', time: '10:30 AM' },
  { id: 'SB001-2026-000541', customer: 'Priya Sharma', time: '10:15 AM' },
  { id: 'SB001-2026-000540', customer: 'Amit Singh', time: '09:45 AM' },
  { id: 'SB001-2026-000539', customer: 'Meera Patil', time: '09:30 AM' },
]

function CashierDashboard() {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {user?.fullName || 'Cashier'}
          </h1>
          <p className="text-gray-500">
            {user?.branch?.name || 'Branch'} - Cash Counter
          </p>
        </div>
        <Button onClick={() => navigate('/bills/new')} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Bill
        </Button>
      </div>

      {/* Today's Stats - no amounts shown */}
      <div className="grid gap-4 md:grid-cols-2">
        {todayStats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Bills - no amounts shown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/bills')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentBills.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <div>
                  <p className="font-medium text-gray-900">{bill.customer}</p>
                  <p className="text-sm text-gray-500">{bill.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{bill.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate('/customers')}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <p className="font-medium text-gray-900">Add Customer</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate('/bills')}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Receipt className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium text-gray-900">View Bills</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate('/cash-reconciliation')}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <p className="font-medium text-gray-900">Cash Reconciliation</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CashierDashboard
