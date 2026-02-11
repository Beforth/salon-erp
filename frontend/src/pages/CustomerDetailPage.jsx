import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customerService } from '@/services/customer.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import CustomerModal from '@/components/modals/CustomerModal'
import { formatDateTime, formatDate, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  Star,
  Heart,
  TrendingUp,
  Loader2,
  Clock,
  IndianRupee,
  Users,
  Scissors,
  FileText,
  Pencil,
} from 'lucide-react'

const statusColors = {
  completed: 'success',
  pending: 'warning',
  draft: 'secondary',
  cancelled: 'destructive',
}

function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Fetch customer details
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getCustomerById(id),
    enabled: !!id,
  })

  // Fetch customer history with bills
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['customer-history', id, page],
    queryFn: () => customerService.getCustomerHistory(id, { page, limit: 10 }),
    enabled: !!id,
  })

  const customer = customerData?.data
  const history = historyData?.data
  const statistics = history?.statistics
  const bills = history?.bills || []
  const pagination = history?.pagination || { page: 1, totalPages: 1, total: 0 }

  const isLoading = customerLoading || historyLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-red-500">
            Customer not found
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="h-6 w-6" />
              {customer.customer_name}
            </h1>
            <p className="text-gray-500">
              Customer since {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/bills/new`)}>
            <Receipt className="h-4 w-4 mr-2" />
            New Bill
          </Button>
          <Button onClick={() => setEditModalOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Customer
          </Button>
        </div>
      </div>

      {/* Customer Info & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Profile */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar & Name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {customer.customer_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-lg">{customer.customer_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {customer.customer_code && (
                    <Badge variant="secondary" className="font-mono">
                      #{customer.customer_code}
                    </Badge>
                  )}
                  <Badge variant="outline" className="capitalize">
                    {customer.gender || 'Not specified'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-4 border-t">
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.date_of_birth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(customer.date_of_birth)}</span>
                </div>
              )}
              {(customer.address || customer.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span>
                    {[customer.address, customer.city, customer.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {customer.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-700">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Total Visits */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Visits</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {statistics?.total_bills || customer.total_visits || 0}
                </p>
              </div>

              {/* Total Spent */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Spent</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(statistics?.total_spent || customer.total_spent || 0)}
                </p>
              </div>

              {/* Average Bill */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Receipt className="h-4 w-4" />
                  <span className="text-sm font-medium">Average Bill</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {formatCurrency(statistics?.average_bill || 0)}
                </p>
              </div>

              {/* Last Visit */}
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Last Visit</span>
                </div>
                <p className="text-lg font-bold text-orange-700">
                  {statistics?.last_visit
                    ? formatDate(statistics.last_visit)
                    : customer.last_visit_date
                    ? formatDate(customer.last_visit_date)
                    : 'Never'}
                </p>
              </div>

              {/* Favorite Service */}
              <div className="p-4 bg-pink-50 rounded-lg">
                <div className="flex items-center gap-2 text-pink-600 mb-1">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm font-medium">Favorite Service</span>
                </div>
                <p className="text-lg font-bold text-pink-700 truncate">
                  {statistics?.favorite_service || '-'}
                </p>
              </div>

              {/* Preferred Employee */}
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Scissors className="h-4 w-4" />
                  <span className="text-sm font-medium">Preferred Staff</span>
                </div>
                <p className="text-lg font-bold text-indigo-700 truncate">
                  {statistics?.preferred_employee || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Visit History
            <Badge variant="secondary" className="ml-2">
              {pagination.total} bills
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No visit history yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/bills/new')}
              >
                Create First Bill
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.bill_id}>
                      <TableCell className="font-mono text-sm">
                        {bill.bill_number}
                      </TableCell>
                      <TableCell>{formatDate(bill.bill_date)}</TableCell>
                      <TableCell>{bill.branch?.name || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {bill.items_summary || '-'}
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(bill.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[bill.status] || 'secondary'}>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/bills/${bill.bill_id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <CustomerModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        customer={customer}
      />
    </div>
  )
}

export default CustomerDetailPage
