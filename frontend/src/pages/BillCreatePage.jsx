import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '@/services/customer.service'
import { serviceService } from '@/services/service.service'
import { branchService } from '@/services/branch.service'
import { billService } from '@/services/bill.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Loader2,
  Check,
  Percent,
  Split,
} from 'lucide-react'
import { toast } from 'sonner'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: Smartphone },
]

function BillCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)

  const branchId = user?.branchId || null

  // State
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState(branchId)
  const [cartItems, setCartItems] = useState([])
  const [billDiscount, setBillDiscount] = useState(0)
  const [discountReason, setDiscountReason] = useState('')
  const [payments, setPayments] = useState([{ payment_mode: 'cash', amount: '' }])
  const [notes, setNotes] = useState('')

  // Queries
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => customerService.getCustomers({ search: customerSearch, limit: 10 }),
    enabled: customerSearch.length >= 2,
  })

  const { data: servicesData } = useQuery({
    queryKey: ['services', 'active', selectedBranch],
    queryFn: () => serviceService.getServices({ is_active: 'true', branch_id: selectedBranch }),
    enabled: !!selectedBranch,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
    enabled: !branchId,
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees', selectedBranch],
    queryFn: () => branchService.getBranchEmployees(selectedBranch),
    enabled: !!selectedBranch,
  })

  const customers = customersData?.data || []
  const services = servicesData?.data || []
  const branches = branchesData?.data || []
  const employees = employeesData?.data || []

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped = {}
    services.forEach((service) => {
      const categoryName = service.category?.category_name || 'Other'
      if (!grouped[categoryName]) {
        grouped[categoryName] = []
      }
      grouped[categoryName].push(service)
    })
    return grouped
  }, [services])

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  )
  const itemsDiscount = cartItems.reduce(
    (sum, item) => sum + (item.discount_amount || 0),
    0
  )
  const totalDiscount = itemsDiscount + billDiscount
  const totalAmount = subtotal - totalDiscount

  // Calculate payment totals
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const remaining = totalAmount - totalPaid

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: billService.createBill,
    onSuccess: () => {
      toast.success('Bill created successfully!')
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate(`/bills`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create bill')
    },
  })

  // Handlers
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.customer_name)
    setShowCustomerDropdown(false)
  }

  const handleAddToCart = (service) => {
    const existingItem = cartItems.find(
      (item) => item.service_id === service.service_id
    )
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.service_id === service.service_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCartItems([
        ...cartItems,
        {
          item_type: 'service',
          service_id: service.service_id,
          service_name: service.service_name,
          unit_price: service.price,
          quantity: 1,
          employee_id: null,
          discount_amount: 0,
        },
      ])
    }
  }

  const handleUpdateQuantity = (index, delta) => {
    setCartItems(
      cartItems
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const handleRemoveItem = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index))
  }

  const handleAssignEmployee = (index, employeeId) => {
    setCartItems(
      cartItems.map((item, i) =>
        i === index ? { ...item, employee_id: employeeId } : item
      )
    )
  }

  const handleItemDiscount = (index, discount) => {
    const discountValue = parseFloat(discount) || 0
    setCartItems(
      cartItems.map((item, i) =>
        i === index ? { ...item, discount_amount: discountValue } : item
      )
    )
  }

  // Payment handlers
  const handleAddPayment = () => {
    setPayments([...payments, { payment_mode: 'cash', amount: '' }])
  }

  const handleRemovePayment = (index) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index))
    }
  }

  const handlePaymentChange = (index, field, value) => {
    setPayments(
      payments.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    )
  }

  const handleSetFullAmount = (index) => {
    const otherPayments = payments.reduce(
      (sum, p, i) => (i !== index ? sum + (parseFloat(p.amount) || 0) : sum),
      0
    )
    const remainingAmount = Math.max(0, totalAmount - otherPayments)
    handlePaymentChange(index, 'amount', remainingAmount.toFixed(2))
  }

  const handleSubmit = () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer')
      return
    }
    if (!selectedBranch) {
      toast.error('Please select a branch')
      return
    }
    if (cartItems.length === 0) {
      toast.error('Please add at least one item')
      return
    }
    if (totalAmount < 0) {
      toast.error('Total amount cannot be negative')
      return
    }

    // Validate payments
    const validPayments = payments.filter(p => parseFloat(p.amount) > 0)
    if (validPayments.length === 0) {
      toast.error('Please add at least one payment')
      return
    }

    const paymentTotal = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
    if (Math.abs(paymentTotal - totalAmount) > 0.01) {
      toast.error(`Payment total (${formatCurrency(paymentTotal)}) must equal bill total (${formatCurrency(totalAmount)})`)
      return
    }

    const billData = {
      customer_id: selectedCustomer.customer_id,
      branch_id: selectedBranch,
      items: cartItems.map((item) => ({
        item_type: item.item_type,
        service_id: item.service_id,
        employee_id: item.employee_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount || 0,
      })),
      payments: validPayments.map(p => ({
        payment_mode: p.payment_mode,
        amount: parseFloat(p.amount),
      })),
      discount_amount: billDiscount,
      discount_reason: discountReason,
      notes,
    }

    createBillMutation.mutate(billData)
  }

  // Set default branch for non-owner users
  useEffect(() => {
    if (branchId && !selectedBranch) {
      setSelectedBranch(branchId)
    }
  }, [branchId, selectedBranch])

  // Clear cart when branch changes
  useEffect(() => {
    setCartItems([])
  }, [selectedBranch])

  // Auto-set first payment amount when total changes
  useEffect(() => {
    if (payments.length === 1 && !payments[0].amount && totalAmount > 0) {
      setPayments([{ ...payments[0], amount: totalAmount.toFixed(2) }])
    }
  }, [totalAmount])

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Left Panel - Service Selection */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">New Bill</h1>
          <p className="text-gray-500">Create a new bill for a customer</p>
        </div>

        {/* Customer Selection */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1 relative">
                <Label className="mb-2 block">Customer</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customer by name or phone..."
                    className="pl-10"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setShowCustomerDropdown(true)
                      if (!e.target.value) setSelectedCustomer(null)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                  />
                  {selectedCustomer && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                {showCustomerDropdown && customerSearch.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {customersLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Searching...
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No customers found
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <div
                          key={customer.customer_id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          <div className="font-medium">{customer.customer_name}</div>
                          <div className="text-sm text-gray-500">{customer.phone_masked}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {!branchId && (
                <div className="w-48">
                  <Label className="mb-2 block">Branch</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={selectedBranch || ''}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.branch_id} value={branch.branch_id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4">
            {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
              <div key={category} className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">{category}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categoryServices.map((service) => (
                    <button
                      key={service.service_id}
                      onClick={() => handleAddToCart(service)}
                      className="p-3 bg-gray-50 hover:bg-primary/5 hover:border-primary border-2 border-transparent rounded-lg text-left transition-colors"
                    >
                      <div className="font-medium text-sm truncate">{service.service_name}</div>
                      <div className="text-primary font-bold mt-1">{formatCurrency(service.price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-[420px] flex flex-col">
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Cart
              </span>
              <Badge variant="secondary">{cartItems.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No items in cart</p>
                <p className="text-sm">Click on services to add them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{item.service_name}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(item.unit_price * item.quantity)}</div>
                        {item.discount_amount > 0 && (
                          <div className="text-xs text-red-500">-{formatCurrency(item.discount_amount)}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-md">
                        <button onClick={() => handleUpdateQuantity(index, -1)} className="p-1 hover:bg-gray-100">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(index, 1)} className="p-1 hover:bg-gray-100">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <select
                        className="flex-1 h-8 text-sm border rounded-md px-2"
                        value={item.employee_id || ''}
                        onChange={(e) => handleAssignEmployee(index, e.target.value || null)}
                      >
                        <option value="">Assign Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.employee_id} value={emp.employee_id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Item Discount:</span>
                      <Input
                        type="number"
                        min="0"
                        className="h-7 w-24 text-sm"
                        placeholder="0"
                        value={item.discount_amount || ''}
                        onChange={(e) => handleItemDiscount(index, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {/* Bill Summary & Checkout */}
          <div className="border-t p-4 space-y-4 bg-gray-50">
            {/* Bill Level Discount */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Bill Discount
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Discount amount"
                  value={billDiscount || ''}
                  onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                  className="flex-1"
                />
                <Input
                  placeholder="Reason (optional)"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Split Payment Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Split className="h-4 w-4" />
                  Payment {payments.length > 1 && `(${payments.length} splits)`}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddPayment}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Split
                </Button>
              </div>

              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex gap-1">
                      {PAYMENT_MODES.map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => handlePaymentChange(index, 'payment_mode', mode.value)}
                          className={`p-2 rounded border transition-colors ${
                            payment.payment_mode === mode.value
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={mode.label}
                        >
                          <mode.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={payment.amount}
                        onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                        className="pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => handleSetFullAmount(index)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary hover:underline"
                      >
                        Full
                      </button>
                    </div>
                    {payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePayment(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              {payments.length > 1 && (
                <div className="text-xs space-y-1 pt-2 border-t">
                  <div className="flex justify-between text-gray-500">
                    <span>Total Paid</span>
                    <span>{formatCurrency(totalPaid)}</span>
                  </div>
                  {remaining !== 0 && (
                    <div className={`flex justify-between font-medium ${remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      <span>{remaining > 0 ? 'Remaining' : 'Excess'}</span>
                      <span>{formatCurrency(Math.abs(remaining))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (optional)</Label>
              <Input
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12 text-lg"
              onClick={handleSubmit}
              disabled={
                createBillMutation.isPending ||
                !selectedCustomer ||
                cartItems.length === 0 ||
                Math.abs(totalPaid - totalAmount) > 0.01
              }
            >
              {createBillMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Bill...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Complete Bill - {formatCurrency(totalAmount)}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default BillCreatePage
