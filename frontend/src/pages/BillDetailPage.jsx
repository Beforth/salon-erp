import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { billService } from '@/services/bill.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { formatDateTime, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Printer,
  Receipt,
  User,
  Building2,
  Calendar,
  CreditCard,
  Loader2,
  Phone,
  Mail,
  FileText,
  Banknote,
  Smartphone,
} from 'lucide-react'

const statusColors = {
  completed: 'success',
  pending: 'warning',
  draft: 'secondary',
  cancelled: 'destructive',
}

const paymentIcons = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
}

function BillDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const printRef = useRef(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['bill', id],
    queryFn: () => billService.getBillById(id),
    enabled: !!id,
  })

  const bill = data?.data

  const handlePrint = () => {
    const printContent = printRef.current
    const originalContents = document.body.innerHTML

    // Create print-specific styles
    const printStyles = `
      <style>
        @media print {
          body { font-family: 'Inter', sans-serif; padding: 20px; }
          .no-print { display: none !important; }
          .print-header { text-align: center; margin-bottom: 20px; }
          .print-header h1 { font-size: 24px; margin: 0; }
          .print-header p { color: #666; margin: 5px 0; }
          .bill-info { display: flex; justify-content: space-between; margin: 20px 0; }
          .bill-info-section { flex: 1; }
          .bill-info-section h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
          .bill-info-section p { margin: 4px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .totals-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 12px; }
          .payment-info { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        }
      </style>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill ${bill?.bill_number}</title>
          ${printStyles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/bills')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bills
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-red-500">
            {error?.response?.data?.error?.message || 'Bill not found'}
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
          <Button variant="ghost" onClick={() => navigate('/bills')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              {bill.bill_number}
            </h1>
            <p className="text-gray-500">
              Created on {formatDateTime(bill.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Badge
            variant={statusColors[bill.status] || 'secondary'}
            className="h-9 px-4 text-sm"
          >
            {bill.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Bill Content - This is what gets printed */}
      <div ref={printRef}>
        {/* Print Header (hidden on screen) */}
        <div className="hidden print:block print-header">
          <h1>{bill.branch?.branch_name}</h1>
          <p>Tax Invoice / Bill of Supply</p>
        </div>

        {/* Customer & Branch Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <button
                className="font-semibold text-lg hover:text-primary hover:underline text-left"
                onClick={() => navigate(`/customers/${bill.customer?.customer_id}`)}
              >
                {bill.customer?.customer_name}
              </button>
              {bill.customer?.phone_masked && (
                <p className="text-gray-600 flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {bill.customer.phone_masked}
                </p>
              )}
              {bill.customer?.email && (
                <p className="text-gray-600 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {bill.customer.email}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Branch Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Branch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{bill.branch?.branch_name}</p>
              <p className="text-gray-600">{bill.branch?.branch_code}</p>
            </CardContent>
          </Card>

          {/* Bill Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Bill Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{formatDate(bill.bill_date)}</p>
              <p className="text-gray-600">
                {bill.created_by?.full_name && `By ${bill.created_by.full_name}`}
              </p>
              {bill.is_imported && (
                <Badge variant="outline" className="mt-2">
                  <FileText className="h-3 w-3 mr-1" />
                  Imported
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bill Items */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Served By</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items?.map((item, index) => (
                  <TableRow key={item.item_id}>
                    <TableCell className="text-gray-500">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {item.service?.service_name ||
                          item.package?.package_name ||
                          item.product?.product_name ||
                          'Unknown Item'}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {item.item_type}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.employees && item.employees.length > 0
                        ? item.employees.map(e => e.full_name).join(', ')
                        : item.employee?.full_name || '-'}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {item.discount_amount > 0
                        ? `-${formatCurrency(item.discount_amount)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="text-right font-medium">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(bill.subtotal)}
                  </TableCell>
                </TableRow>
                {bill.discount_amount > 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-medium text-red-500">
                      Discount
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      -{formatCurrency(bill.discount_amount)}
                    </TableCell>
                  </TableRow>
                )}
                {bill.tax_amount > 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-medium">
                      Tax
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(bill.tax_amount)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={6} className="text-right font-bold text-lg">
                    Total Amount
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-primary">
                    {formatCurrency(bill.total_amount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bill.payments?.map((payment) => {
                const PaymentIcon = paymentIcons[payment.payment_mode] || CreditCard
                return (
                  <div
                    key={payment.payment_id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <PaymentIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{payment.payment_mode}</p>
                        {payment.transaction_reference && (
                          <p className="text-sm text-gray-500">
                            Ref: {payment.transaction_reference}
                          </p>
                        )}
                        {payment.bank_name && (
                          <p className="text-sm text-gray-500">{payment.bank_name}</p>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {bill.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{bill.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Print Footer (hidden on screen) */}
        <div className="hidden print:block footer">
          <Separator className="my-4" />
          <p>Thank you for your visit!</p>
          <p>Bill generated on {formatDateTime(new Date())}</p>
        </div>
      </div>
    </div>
  )
}

export default BillDetailPage
