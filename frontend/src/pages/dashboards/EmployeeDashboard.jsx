import { useSelector } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  Scissors,
  Clock,
  Calendar,
  TrendingUp,
} from 'lucide-react'

const todayStats = [
  {
    name: 'Services Done',
    value: '8',
    icon: Scissors,
  },
  {
    name: 'Stars Earned',
    value: '80',
    icon: Star,
  },
  {
    name: 'Hours Worked',
    value: '6.5',
    icon: Clock,
  },
]

const monthlyPerformance = {
  servicesCompleted: 142,
  totalStars: 1420,
  revenue: '₹71,000',
  attendanceDays: 22,
  totalWorkingDays: 24,
  bonus: '₹2,000',
}

const recentServices = [
  { service: 'Haircut - Premium', customer: 'Raj Kumar', stars: 10, time: '10:30 AM' },
  { service: 'Hair Styling', customer: 'Priya Sharma', stars: 8, time: '10:00 AM' },
  { service: 'Beard Trim', customer: 'Amit Singh', stars: 3, time: '09:30 AM' },
  { service: 'Face Cleanup', customer: 'Vikram Joshi', stars: 10, time: '09:00 AM' },
]

function EmployeeDashboard() {
  const { user } = useSelector((state) => state.auth)

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user?.fullName || 'Employee'}
        </h1>
        <p className="text-gray-500">
          {user?.branch?.name || 'Branch'} - Your performance dashboard
        </p>
      </div>

      {/* Today's Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>February 2026</CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Services Completed</span>
                <span className="font-bold text-gray-900">{monthlyPerformance.servicesCompleted}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Stars</span>
                <span className="font-bold text-gray-900 flex items-center">
                  {monthlyPerformance.totalStars}
                  <Star className="h-4 w-4 ml-1 text-yellow-500 fill-yellow-500" />
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Revenue Generated</span>
                <span className="font-bold text-gray-900">{monthlyPerformance.revenue}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Attendance</span>
                <span className="font-bold text-gray-900">
                  {monthlyPerformance.attendanceDays}/{monthlyPerformance.totalWorkingDays} days
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-green-700">Expected Bonus</span>
                <Badge variant="success" className="text-base px-3 py-1">
                  {monthlyPerformance.bonus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Services */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Services</CardTitle>
            <CardDescription>Services you've completed today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentServices.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{service.service}</p>
                    <p className="text-sm text-gray-500">{service.customer}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-yellow-600">
                      <Star className="h-4 w-4 mr-1 fill-yellow-500" />
                      <span className="font-bold">{service.stars}</span>
                    </div>
                    <p className="text-sm text-gray-500">{service.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{
                  width: `${(monthlyPerformance.attendanceDays / monthlyPerformance.totalWorkingDays) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {Math.round((monthlyPerformance.attendanceDays / monthlyPerformance.totalWorkingDays) * 100)}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            You've been present for {monthlyPerformance.attendanceDays} out of {monthlyPerformance.totalWorkingDays} working days this month.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default EmployeeDashboard
