import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Users,
  Receipt,
  Clock,
  UserCheck,
} from 'lucide-react'
import LowStockAlertsCard from '@/components/dashboard/LowStockAlertsCard'

const stats = [
  {
    name: "Today's Revenue",
    value: '₹25,340',
    icon: DollarSign,
    description: '48 bills',
  },
  {
    name: 'Staff Present',
    value: '8/10',
    icon: UserCheck,
    description: '2 on leave',
  },
  {
    name: "Today's Customers",
    value: '45',
    icon: Users,
    description: '3 new customers',
  },
  {
    name: 'Pending Bills',
    value: '3',
    icon: Clock,
    description: 'In progress',
  },
]

const topEmployees = [
  { name: 'Ramesh Kumar', services: 12, stars: 120, revenue: '₹6,000' },
  { name: 'Suresh Patil', services: 10, stars: 100, revenue: '₹5,200' },
  { name: 'Priya Sharma', services: 8, stars: 80, revenue: '₹4,800' },
]

function ManagerDashboard() {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {user?.fullName || 'Manager'}
        </h1>
        <p className="text-gray-500">
          {user?.branch?.name || 'Branch'} - Here's your daily overview
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alerts */}
      <LowStockAlertsCard maxItems={3} />

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers Today</CardTitle>
          <CardDescription>Staff performance ranking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topEmployees.map((employee, index) => (
              <div
                key={employee.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{employee.name}</p>
                    <p className="text-sm text-gray-500">
                      {employee.services} services · {employee.stars} stars
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{employee.revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/bills/new')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Create Bill</p>
              <p className="text-sm text-gray-500">Start a new transaction</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/customers')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Customers</p>
              <p className="text-sm text-gray-500">Manage customer database</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ManagerDashboard
