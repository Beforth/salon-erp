import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billService } from '@/services/bill.service'
import { branchService } from '@/services/branch.service'
import { serviceService } from '@/services/service.service'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Trash2,
  Pencil,
  Armchair,
  Check,
  XCircle,
  Package,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { printThermalReceipt } from '@/components/ThermalReceipt'
import CompleteBillModal from '@/components/modals/CompleteBillModal'

const statusColors = {
  completed: 'success',
  pending: 'warning',
  partial: 'warning',
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
  const queryClient = useQueryClient()
  const printRef = useRef(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editItemStatuses, setEditItemStatuses] = useState({})
  const [completeBillModalOpen, setCompleteBillModalOpen] = useState(false)
  const [partialBillMode, setPartialBillMode] = useState(false)
  const [removedPackageInstanceIds, setRemovedPackageInstanceIds] = useState([])
  const [reconfigModalOpen, setReconfigModalOpen] = useState(false)
  const [reconfigPackage, setReconfigPackage] = useState(null) // { package_instance_id, package_id, package_name }
  const [reconfigServices, setReconfigServices] = useState([]) // [{ service_id, employee_id, employee_ids }]
  const [reconfigPrice, setReconfigPrice] = useState('')

  const deleteBillMutation = useMutation({
    mutationFn: () => billService.cancelBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['chairs'] })
      navigate('/bills')
    },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['bill', id],
    queryFn: () => billService.getBillById(id),
    enabled: !!id,
  })

  const bill = data?.data

  // Fetch branch employees for reconfigure modal
  const branchId = bill?.branch?.branch_id
  const { data: employeesData } = useQuery({
    queryKey: ['employees', branchId],
    queryFn: () => branchService.getBranchEmployees(branchId),
    enabled: !!branchId && reconfigModalOpen,
  })
  const employees = employeesData?.data || []

  // Fetch package details when reconfiguring
  const reconfigPkgId = reconfigPackage?.package_id
  const { data: reconfigPkgData } = useQuery({
    queryKey: ['package', reconfigPkgId],
    queryFn: () => serviceService.getPackageById(reconfigPkgId),
    enabled: !!reconfigPkgId && reconfigModalOpen,
  })
  const reconfigPkgDetail = reconfigPkgData?.data

  const updateBillMutation = useMutation({
    mutationFn: (data) => billService.updateBill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', id] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setEditModalOpen(false)
      toast.success('Bill updated')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update bill')
    },
  })

  useEffect(() => {
    if (bill?.items && editModalOpen) {
      const statuses = {}
      bill.items.forEach((item) => {
        statuses[item.item_id] = item.status || 'completed'
      })
      setEditItemStatuses(statuses)
      setRemovedPackageInstanceIds([])
    }
  }, [bill?.items, editModalOpen])

  // Group bill items for screen display (packages grouped, singles separate)
  const groupedBillItems = useMemo(() => {
    if (!bill?.items) return []

    // Tier 1: Use package_summary if available (new backend)
    if (bill.package_summary?.length) {
      const groups = []
      const itemsByInstance = {}

      // Map items by package_instance_id
      bill.items.forEach((item) => {
        if (item.package_instance_id) {
          if (!itemsByInstance[item.package_instance_id]) {
            itemsByInstance[item.package_instance_id] = []
          }
          itemsByInstance[item.package_instance_id].push(item)
        }
      })

      // Build package groups from summary
      const usedItemIds = new Set()
      bill.package_summary.forEach((pkg) => {
        const pkgItems = itemsByInstance[pkg.package_instance_id] || []
        pkgItems.forEach((i) => usedItemIds.add(i.item_id))
        groups.push({
          type: 'package',
          package_instance_id: pkg.package_instance_id,
          package_name: pkg.package_name,
          package_price: pkg.package_price,
          package_id: pkg.package_id,
          items: pkgItems,
          total: pkgItems.reduce((s, i) => s + i.total_price, 0),
          subtotal: pkgItems.reduce((s, i) => s + i.unit_price * i.quantity, 0),
          discount: pkgItems.reduce((s, i) => s + (i.discount_amount || 0), 0),
          savings: pkg.savings ?? 0,
        })
      })

      // Remaining items as singles
      bill.items.forEach((item) => {
        if (!usedItemIds.has(item.item_id)) {
          groups.push({ type: 'single', item })
        }
      })

      return groups
    }

    // Tier 2: Group by package_instance_id if present
    const hasInstanceIds = bill.items.some((i) => i.package_instance_id)
    if (hasInstanceIds) {
      const groups = []
      const instanceMap = {}
      bill.items.forEach((item) => {
        if (item.package_instance_id) {
          if (!instanceMap[item.package_instance_id]) {
            instanceMap[item.package_instance_id] = []
          }
          instanceMap[item.package_instance_id].push(item)
        } else {
          groups.push({ type: 'single', item })
        }
      })
      Object.entries(instanceMap).forEach(([instanceId, items]) => {
        const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
        const discount = items.reduce((s, i) => s + (i.discount_amount || 0), 0)
        groups.push({
          type: 'package',
          package_instance_id: instanceId,
          package_name: items[0].notes || 'Package',
          package_price: subtotal,
          items,
          total: items.reduce((s, i) => s + i.total_price, 0),
          subtotal,
          discount,
          savings: 0,
        })
      })
      return groups
    }

    // Tier 3: Legacy fallback — group by notes
    const groups = []
    const noteGroups = {}
    bill.items.forEach((item) => {
      if (item.notes && bill.items.filter((i) => i.notes === item.notes).length > 1) {
        if (!noteGroups[item.notes]) {
          noteGroups[item.notes] = []
        }
        noteGroups[item.notes].push(item)
      } else {
        groups.push({ type: 'single', item })
      }
    })
    Object.entries(noteGroups).forEach(([noteName, items]) => {
      const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
      const discount = items.reduce((s, i) => s + (i.discount_amount || 0), 0)
      groups.push({
        type: 'package',
        package_name: noteName,
        items,
        total: items.reduce((s, i) => s + i.total_price, 0),
        subtotal,
        discount,
        savings: 0,
      })
    })
    return groups
  }, [bill?.items, bill?.package_summary])

  // Compute print-friendly items (packages collapsed into single lines)
  const printItems = useMemo(() => {
    if (!bill?.items) return []

    // Prefer package_summary for new-format bills
    if (bill.package_summary?.length) {
      const result = []
      const usedItemIds = new Set()

      bill.package_summary.forEach((pkg) => {
        const pkgItems = bill.items.filter((i) => i.package_instance_id === pkg.package_instance_id)
        pkgItems.forEach((i) => usedItemIds.add(i.item_id))
        const totalPrice = pkgItems.reduce((s, i) => s + i.total_price, 0)
        const unitPrice = pkgItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
        const discountAmount = pkgItems.reduce((s, i) => s + (i.discount_amount || 0), 0)
        result.push({
          item_name: pkg.package_name,
          item_type: 'package',
          quantity: 1,
          unit_price: unitPrice,
          discount_amount: discountAmount,
          total_price: totalPrice,
        })
      })

      bill.items.forEach((item) => {
        if (!usedItemIds.has(item.item_id)) {
          result.push(item)
        }
      })

      return result
    }

    // Fallback: existing notes-matching logic for old bills
    const packageGroups = {}
    const standalone = []

    bill.items.forEach((item) => {
      if (item.notes && bill.items.filter((i) => i.notes === item.notes).length > 1) {
        const pkgName = item.notes
        if (!packageGroups[pkgName]) {
          packageGroups[pkgName] = { item_name: pkgName, item_type: 'package', quantity: 1, unit_price: 0, discount_amount: 0, total_price: 0 }
        }
        packageGroups[pkgName].total_price += item.total_price
        packageGroups[pkgName].unit_price += item.unit_price * item.quantity
        packageGroups[pkgName].discount_amount += item.discount_amount || 0
      } else {
        standalone.push(item)
      }
    })

    return [...Object.values(packageGroups), ...standalone]
  }, [bill?.items, bill?.package_summary])

  const handlePrint = () => {
    const printContent = printRef.current

    const printStyles = `
      <style>
        @media print {
          body { font-family: 'Inter', sans-serif; padding: 20px; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
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

  const isPending = bill.status === 'pending' || bill.status === 'partial'

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
        <div className="flex flex-wrap gap-2 items-center">
          {isPending && (
            <>
              <Button
                onClick={() => {
                  setPartialBillMode(false)
                  setCompleteBillModalOpen(true)
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Complete Bill
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPartialBillMode(true)
                  setCompleteBillModalOpen(true)
                }}
              >
                Partial Bill
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => {
                  if (window.confirm(`Cancel bill ${bill.bill_number}? This action cannot be undone.`)) {
                    deleteBillMutation.mutate()
                  }
                }}
                disabled={deleteBillMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Bill
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => printThermalReceipt(bill)}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print A4
          </Button>
          {bill.status !== 'cancelled' && (
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {bill.status !== 'cancelled' && !isPending && (
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => {
                if (window.confirm(`Delete bill ${bill.bill_number}? This will cancel the bill.`)) {
                  deleteBillMutation.mutate()
                }
              }}
              disabled={deleteBillMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
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

        {/* Customer, Branch, Bill Info & Chair */}
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

          {/* Bill Info + Chair */}
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
              {bill.chair && (
                <p className="text-gray-600 flex items-center gap-1 mt-1">
                  <Armchair className="h-3.5 w-3.5" />
                  Chair: {bill.chair.chair_number}
                  {bill.chair.chair_name && ` - ${bill.chair.chair_name}`}
                </p>
              )}
              {bill.is_imported && (
                <Badge variant="outline" className="mt-2">
                  <FileText className="h-3 w-3 mr-1" />
                  Imported
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bill Items - Screen version (shows all expanded items) */}
        <Card className="mt-6 no-print">
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
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let rowNum = 0
                  return groupedBillItems.map((group, gIdx) => {
                    if (group.type === 'package') {
                      rowNum++
                      const headerNum = rowNum
                      return (
                        <React.Fragment key={`pkg-${group.package_instance_id || gIdx}`}>
                          {/* Package header row */}
                          <TableRow className="bg-blue-50/60">
                            <TableCell className="text-gray-500">{headerNum}</TableCell>
                            <TableCell colSpan={2}>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-blue-900">
                                  {group.package_name}
                                </span>
                                <Badge variant="outline" className="text-xs">Package</Badge>
                                {group.savings > 0 && (
                                  <Badge variant="success" className="text-xs">
                                    Save {formatCurrency(group.savings)}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">1</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(group.subtotal)}
                            </TableCell>
                            <TableCell className="text-right text-red-500">
                              {group.discount > 0 ? `-${formatCurrency(group.discount)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(group.total)}
                            </TableCell>
                            <TableCell className="text-center">
                              {group.items.some((i) => i.status === 'pending') ? (
                                <Badge variant="warning" className="text-xs">Pending</Badge>
                              ) : (
                                <Badge variant="success" className="text-xs">Completed</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                          {/* Indented service rows */}
                          {group.items.map((item) => (
                            <TableRow key={item.item_id} className="bg-blue-50/30">
                              <TableCell></TableCell>
                              <TableCell>
                                <div className="pl-6 text-sm text-gray-700">
                                  {item.item_name ?? item.service?.service_name ?? 'Service'}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {item.employees && item.employees.length > 0
                                  ? item.employees.map(e => e.full_name).join(', ')
                                  : item.employee?.full_name || '-'}
                              </TableCell>
                              <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(item.unit_price)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-red-500">
                                {item.discount_amount > 0
                                  ? `-${formatCurrency(item.discount_amount)}`
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(item.total_price)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={item.status === 'pending' ? 'warning' : 'success'}
                                  className="text-xs capitalize"
                                >
                                  {item.status || 'completed'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      )
                    }

                    // Single item
                    rowNum++
                    const item = group.item
                    return (
                      <TableRow key={item.item_id}>
                        <TableCell className="text-gray-500">{rowNum}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {item.item_name ??
                              item.service?.service_name ??
                              item.service?.serviceName ??
                              item.package?.package_name ??
                              item.package?.packageName ??
                              item.product?.product_name ??
                              item.product?.productName ??
                              item.notes ??
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
                        <TableCell className="text-center">
                          <Badge
                            variant={item.status === 'pending' ? 'warning' : 'success'}
                            className="text-xs capitalize"
                          >
                            {item.status || 'completed'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                })()}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={7} className="text-right font-medium">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(bill.subtotal)}
                  </TableCell>
                </TableRow>
                {bill.discount_amount > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-right font-medium text-red-500">
                      Discount
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      -{formatCurrency(bill.discount_amount)}
                    </TableCell>
                  </TableRow>
                )}
                {bill.tax_amount > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-right font-medium">
                      Tax
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(bill.tax_amount)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={7} className="text-right font-bold text-lg">
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

        {/* Bill Items - Print version (packages collapsed) */}
        <Card className="mt-6 hidden print-only" style={{ display: 'none' }}>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-gray-500">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {item.item_name || 'Unknown Item'}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {item.item_type}
                      </div>
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
                  <TableCell colSpan={5} className="text-right font-medium">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(bill.subtotal)}
                  </TableCell>
                </TableRow>
                {bill.discount_amount > 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-medium text-red-500">
                      Discount
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      -{formatCurrency(bill.discount_amount)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={5} className="text-right font-bold text-lg">
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
        {bill.payments?.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bill.payments.map((payment) => {
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
        )}

        {/* Pending bill — no payments yet */}
        {isPending && (!bill.payments || bill.payments.length === 0) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-gray-500">
                <p>No payments recorded yet.</p>
                <Button
                  className="mt-3 bg-green-600 hover:bg-green-700"
                  onClick={() => setCompleteBillModalOpen(true)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Complete Bill & Collect Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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

      {/* Edit Bill — item status + package operations */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Bill
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Update item statuses, remove or reconfigure packages.
          </p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {groupedBillItems.map((group, gIdx) => {
              if (group.type === 'package') {
                const isRemoved = group.package_instance_id &&
                  removedPackageInstanceIds.includes(group.package_instance_id)

                return (
                  <div
                    key={`edit-pkg-${group.package_instance_id || gIdx}`}
                    className={`border rounded-lg p-3 ${isRemoved ? 'opacity-50 bg-red-50' : 'bg-blue-50/40'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">{group.package_name}</span>
                        <Badge variant="outline" className="text-xs">Package</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {isPending && group.package_instance_id && group.package_id && !isRemoved && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setReconfigPackage({
                                package_instance_id: group.package_instance_id,
                                package_id: group.package_id,
                                package_name: group.package_name,
                              })
                              // Initialize with current service/employee assignments
                              setReconfigServices(
                                group.items.map((item) => ({
                                  service_id: item.service_id || item.service?.service_id,
                                  employee_id: item.employee?.employee_id || null,
                                  employee_ids: item.employees?.map(e => e.employee_id) || [],
                                }))
                              )
                              setReconfigPrice(group.subtotal?.toString() || '')
                              setReconfigModalOpen(true)
                            }}
                          >
                            <Settings2 className="h-3 w-3 mr-1" />
                            Reconfigure
                          </Button>
                        )}
                        {group.package_instance_id && (
                          <Button
                            variant={isRemoved ? 'outline' : 'destructive'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              if (isRemoved) {
                                setRemovedPackageInstanceIds((prev) =>
                                  prev.filter((id) => id !== group.package_instance_id)
                                )
                              } else {
                                setRemovedPackageInstanceIds((prev) => [
                                  ...prev,
                                  group.package_instance_id,
                                ])
                              }
                            }}
                          >
                            {isRemoved ? 'Undo Remove' : 'Remove'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {!isRemoved && group.items.map((item) => (
                      <div
                        key={item.item_id}
                        className="flex items-center justify-between py-1 pl-6 text-sm"
                      >
                        <span className="truncate flex-1 text-gray-700">
                          {item.item_name ?? item.service?.service_name ?? 'Service'}
                        </span>
                        <select
                          className="ml-2 h-7 px-2 text-xs border rounded-md min-w-[100px]"
                          value={editItemStatuses[item.item_id] || item.status || 'completed'}
                          onChange={(e) =>
                            setEditItemStatuses((prev) => ({
                              ...prev,
                              [item.item_id]: e.target.value,
                            }))
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )
              }

              // Single item
              const item = group.item
              return (
                <div
                  key={item.item_id}
                  className="flex items-center justify-between p-2 rounded border bg-gray-50"
                >
                  <span className="text-sm font-medium truncate flex-1">
                    {item.item_name ??
                      item.service?.service_name ??
                      item.service?.serviceName ??
                      item.package?.package_name ??
                      item.package?.packageName ??
                      item.product?.product_name ??
                      item.product?.productName ??
                      item.notes ??
                      'Unknown'}
                  </span>
                  <select
                    className="ml-2 h-8 px-2 text-sm border rounded-md min-w-[100px]"
                    value={editItemStatuses[item.item_id] || item.status || 'completed'}
                    onChange={(e) =>
                      setEditItemStatuses((prev) => ({
                        ...prev,
                        [item.item_id]: e.target.value,
                      }))
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={updateBillMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Build items payload (status changes, excluding removed packages)
                const removedItemIds = new Set()
                if (removedPackageInstanceIds.length > 0) {
                  bill.items.forEach((i) => {
                    if (i.package_instance_id && removedPackageInstanceIds.includes(i.package_instance_id)) {
                      removedItemIds.add(i.item_id)
                    }
                  })
                }
                const items = bill.items
                  .filter((i) => !removedItemIds.has(i.item_id))
                  .map((i) => ({
                    item_id: i.item_id,
                    status: editItemStatuses[i.item_id] ?? i.status ?? 'completed',
                  }))

                const payload = { items }
                if (removedPackageInstanceIds.length > 0) {
                  payload.remove_package_instance_ids = removedPackageInstanceIds
                }

                updateBillMutation.mutate(payload)
              }}
              disabled={updateBillMutation.isPending}
            >
              {updateBillMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconfigure Package Sub-Modal */}
      <Dialog open={reconfigModalOpen} onOpenChange={setReconfigModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Reconfigure — {reconfigPackage?.package_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {/* Package price */}
            <div>
              <Label className="text-sm font-medium">Package Price</Label>
              <Input
                type="number"
                value={reconfigPrice}
                onChange={(e) => setReconfigPrice(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Services list from package details */}
            {reconfigPkgDetail ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Services</Label>
                {/* Standalone services */}
                {(reconfigPkgDetail.services || []).map((svc, sIdx) => (
                  <div key={svc.service_id} className="border rounded p-2 space-y-1">
                    <div className="text-sm font-medium">{svc.service_name}</div>
                    <div className="text-xs text-gray-500">
                      Price: {formatCurrency(svc.service_price)}
                    </div>
                    <select
                      className="w-full h-8 px-2 text-sm border rounded-md"
                      value={reconfigServices[sIdx]?.employee_id || ''}
                      onChange={(e) => {
                        setReconfigServices((prev) => {
                          const next = [...prev]
                          if (!next[sIdx]) next[sIdx] = { service_id: svc.service_id }
                          next[sIdx] = { ...next[sIdx], service_id: svc.service_id, employee_id: e.target.value || null }
                          return next
                        })
                      }}
                    >
                      <option value="">No employee</option>
                      {employees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {/* Service groups (OR groups) */}
                {(reconfigPkgDetail.service_groups || []).map((group, gIdx) => {
                  const serviceIdx = (reconfigPkgDetail.services || []).length + gIdx
                  return (
                    <div key={`group-${gIdx}`} className="border rounded p-2 space-y-1">
                      <div className="text-sm font-medium text-blue-700">
                        Choose one (Group {gIdx + 1})
                      </div>
                      <select
                        className="w-full h-8 px-2 text-sm border rounded-md"
                        value={reconfigServices[serviceIdx]?.service_id || ''}
                        onChange={(e) => {
                          setReconfigServices((prev) => {
                            const next = [...prev]
                            next[serviceIdx] = {
                              service_id: e.target.value || null,
                              employee_id: next[serviceIdx]?.employee_id || null,
                            }
                            return next
                          })
                        }}
                      >
                        <option value="">Select service</option>
                        {(group.services || []).map((s) => (
                          <option key={s.service_id} value={s.service_id}>
                            {s.service_name} ({formatCurrency(s.service_price)})
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-full h-8 px-2 text-sm border rounded-md"
                        value={reconfigServices[serviceIdx]?.employee_id || ''}
                        onChange={(e) => {
                          setReconfigServices((prev) => {
                            const next = [...prev]
                            if (!next[serviceIdx]) next[serviceIdx] = {}
                            next[serviceIdx] = { ...next[serviceIdx], employee_id: e.target.value || null }
                            return next
                          })
                        }}
                      >
                        <option value="">No employee</option>
                        {employees.map((emp) => (
                          <option key={emp.employee_id} value={emp.employee_id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading package details...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReconfigModalOpen(false)
                setReconfigPackage(null)
              }}
              disabled={updateBillMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const selectedServices = reconfigServices
                  .filter((s) => s?.service_id)
                  .map((s) => {
                    const entry = { service_id: s.service_id }
                    if (s.employee_ids?.length > 1) {
                      entry.employee_ids = s.employee_ids
                    } else if (s.employee_id) {
                      entry.employee_id = s.employee_id
                    }
                    return entry
                  })

                const payload = {
                  items: bill.items.map((i) => ({
                    item_id: i.item_id,
                    status: editItemStatuses[i.item_id] ?? i.status ?? 'completed',
                  })),
                  update_package_services: {
                    package_instance_id: reconfigPackage.package_instance_id,
                    package_price: parseFloat(reconfigPrice) || 0,
                    selected_services: selectedServices,
                  },
                }
                updateBillMutation.mutate(payload)
                setReconfigModalOpen(false)
                setReconfigPackage(null)
              }}
              disabled={updateBillMutation.isPending || !reconfigPkgDetail}
            >
              {updateBillMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Reconfiguration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Bill Modal */}
      <CompleteBillModal
        open={completeBillModalOpen}
        onOpenChange={setCompleteBillModalOpen}
        bill={bill}
        partial={partialBillMode}
      />
    </div>
  )
}

export default BillDetailPage
