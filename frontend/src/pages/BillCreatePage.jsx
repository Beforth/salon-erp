import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '@/services/customer.service'
import { serviceService } from '@/services/service.service'
import { productService } from '@/services/product.service'
import { branchService } from '@/services/branch.service'
import { billService } from '@/services/bill.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import {
  Search,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Loader2,
  Check,
  Percent,
  Split,
  Calendar,
  Clock,
  ShoppingCart,
  Pencil,
  ArrowLeft,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: Smartphone },
]

function BillCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const branchId = user?.branchId || null

  // Bill type from URL param or default to 'current'
  const initialBillType = searchParams.get('type') === 'previous' ? 'previous' : 'current'
  const [billType, setBillType] = useState(initialBillType)

  // Date/time for previous bills
  const [billDate, setBillDate] = useState('')
  const [billTime, setBillTime] = useState('')

  // Customer
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Branch
  const [selectedBranch, setSelectedBranch] = useState(branchId)

  // Item selection
  const [selectedCategory, setSelectedCategory] = useState('services')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [itemPrice, setItemPrice] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [componentEmployees, setComponentEmployees] = useState({}) // { componentIndex: [employeeIds] }

  // Cart
  const [cartItems, setCartItems] = useState([])

  // Edit modal
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [editingPackageGroupId, setEditingPackageGroupId] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Checkout
  const [billDiscountPercent, setBillDiscountPercent] = useState(0)
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

  const { data: packagesData } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => serviceService.getPackages({ is_active: 'true' }),
    enabled: !!selectedBranch,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', 'active', selectedBranch],
    queryFn: () => productService.getProducts({ is_active: 'true', product_type: 'retail' }),
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
  const packages = packagesData?.data || []
  const products = productsData?.data || []
  const branches = branchesData?.data || []
  const employees = employeesData?.data || []

  // Item options based on selected category
  const itemOptions = useMemo(() => {
    if (selectedCategory === 'services') {
      return services.map((s) => ({
        id: s.service_id,
        name: s.service_name,
        price: s.price,
        duration: s.duration_minutes,
        category: s.category?.name,
      }))
    }
    if (selectedCategory === 'packages') {
      return packages.map((p) => ({
        id: p.package_id,
        name: p.package_name,
        price: p.package_price,
        description: p.description,
        services: p.services,
        individual_price: p.individual_price,
        savings: p.savings,
      }))
    }
    if (selectedCategory === 'products') {
      return products.map((p) => ({
        id: p.product_id,
        name: p.product_name,
        price: parseFloat(p.selling_price || p.mrp || 0),
        brand: p.brand,
        stock: p.total_stock,
      }))
    }
    return []
  }, [selectedCategory, services, packages, products])

  // Selected item details
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null
    return itemOptions.find((o) => o.id === selectedItemId)
  }, [selectedItemId, itemOptions])

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const itemsDiscount = cartItems.reduce((sum, item) => {
    const itemTotal = item.unit_price * item.quantity
    return sum + (itemTotal * (item.discount_percent || 0)) / 100
  }, 0)
  const billDiscount =
    subtotal > 0 ? (subtotal - itemsDiscount) * (billDiscountPercent / 100) : 0
  const totalDiscount = itemsDiscount + billDiscount
  const totalAmount = subtotal - totalDiscount
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
      navigate('/bills')
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

  const handleItemSelect = (id) => {
    setSelectedItemId(id || null)
    setComponentEmployees({})
    if (!id) {
      setItemPrice('')
      return
    }
    const item = itemOptions.find((o) => o.id === id)
    if (item) setItemPrice(item.price.toString())
    setItemQuantity(1)
  }

  const handleAddToCart = () => {
    if (!selectedItemId || !itemPrice) return

    if (selectedCategory === 'packages') {
      const pkg = selectedItem
      if (!pkg) return

      if (pkg.services && pkg.services.length > 0) {
        // Expand package into individual services (linked)
        const packagePrice = parseFloat(itemPrice)
        const totalIndividualPrice = pkg.individual_price || 0
        const ratio = totalIndividualPrice > 0 ? packagePrice / totalIndividualPrice : 1
        const groupId = crypto.randomUUID()

        const expandedItems = pkg.services.map((ps, idx) => ({
          cart_id: crypto.randomUUID(),
          item_type: 'service',
          service_id: ps.service_id,
          item_name: ps.service_name,
          unit_price: parseFloat((ps.service_price * ratio).toFixed(2)),
          quantity: ps.quantity,
          employee_ids: componentEmployees[idx] || [],
          employee_id: null,
          discount_percent: 0,
          source_package_id: pkg.id,
          source_package_name: pkg.name,
          package_group_id: groupId,
        }))

        setCartItems([...cartItems, ...expandedItems])
      } else {
        // Flat package — parse name by "+" to extract components
        const packagePrice = parseFloat(itemPrice)
        const components = pkg.name
          .split('+')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

        const flatGroupId = crypto.randomUUID()

        if (components.length <= 1) {
          // Single component or unparseable — add as single item
          setCartItems([
            ...cartItems,
            {
              cart_id: crypto.randomUUID(),
              item_type: 'package',
              package_id: selectedItemId,
              item_name: pkg.name,
              unit_price: packagePrice,
              quantity: 1,
              employee_ids: componentEmployees[0] || [],
              employee_id: null,
              discount_percent: 0,
              source_package_name: pkg.name,
              package_group_id: flatGroupId,
            },
          ])
        } else {
          // Split price equally across components
          const pricePerComponent = parseFloat((packagePrice / components.length).toFixed(2))
          const lastPrice = parseFloat(
            (packagePrice - pricePerComponent * (components.length - 1)).toFixed(2)
          )

          const expandedItems = components.map((name, idx) => ({
            cart_id: crypto.randomUUID(),
            item_type: 'package',
            package_id: selectedItemId,
            item_name: name,
            unit_price: idx === components.length - 1 ? lastPrice : pricePerComponent,
            quantity: 1,
            employee_ids: componentEmployees[idx] || [],
            employee_id: null,
            discount_percent: 0,
            source_package_name: pkg.name,
            package_group_id: flatGroupId,
          }))

          setCartItems([...cartItems, ...expandedItems])
        }
      }
    } else if (selectedCategory === 'services') {
      setCartItems([
        ...cartItems,
        {
          cart_id: crypto.randomUUID(),
          item_type: 'service',
          service_id: selectedItemId,
          item_name: selectedItem?.name || '',
          unit_price: parseFloat(itemPrice),
          quantity: itemQuantity,
          employee_ids: componentEmployees[0] || [],
          employee_id: null,
          discount_percent: 0,
        },
      ])
    } else if (selectedCategory === 'products') {
      setCartItems([
        ...cartItems,
        {
          cart_id: crypto.randomUUID(),
          item_type: 'product',
          product_id: selectedItemId,
          item_name: selectedItem?.name || '',
          unit_price: parseFloat(itemPrice),
          quantity: itemQuantity,
          employee_ids: componentEmployees[0] || [],
          employee_id: null,
          discount_percent: 0,
        },
      ])
    }

    // Reset selection
    setSelectedItemId(null)
    setItemPrice('')
    setItemQuantity(1)
    setComponentEmployees({})
  }

  const updateCartItem = (index, field, value) => {
    setCartItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const handleRemoveItem = (index) => {
    setCartItems((items) => items.filter((_, i) => i !== index))
  }

  const handleRemovePackageGroup = (groupId) => {
    setCartItems((items) => items.filter((item) => item.package_group_id !== groupId))
  }

  const updatePackageGroupDiscount = (groupId, discountPercent) => {
    setCartItems((items) =>
      items.map((item) =>
        item.package_group_id === groupId ? { ...item, discount_percent: discountPercent } : item
      )
    )
  }

  // Group cart items: packages grouped together, standalone items separate
  const groupedCart = useMemo(() => {
    const groups = []
    const seenGroups = new Set()
    cartItems.forEach((item, index) => {
      if (item.package_group_id) {
        if (seenGroups.has(item.package_group_id)) return
        seenGroups.add(item.package_group_id)
        const groupItems = cartItems
          .map((ci, i) => ({ ...ci, _index: i }))
          .filter((ci) => ci.package_group_id === item.package_group_id)
        const groupTotal = groupItems.reduce((sum, gi) => sum + gi.unit_price * gi.quantity, 0)
        groups.push({
          type: 'package',
          package_group_id: item.package_group_id,
          package_name: item.source_package_name,
          items: groupItems,
          total: groupTotal,
          discount_percent: groupItems[0]?.discount_percent || 0,
        })
      } else {
        groups.push({ type: 'single', item, index })
      }
    })
    return groups
  }, [cartItems])

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
    setPayments(payments.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
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
    if (billType === 'previous' && !billDate) {
      toast.error('Please select a date for the previous bill')
      return
    }

    const validPayments = payments.filter((p) => parseFloat(p.amount) > 0)
    if (validPayments.length === 0) {
      toast.error('Please add at least one payment')
      return
    }

    const paymentTotal = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
    if (Math.abs(paymentTotal - totalAmount) > 0.01) {
      toast.error(
        `Payment total (${formatCurrency(paymentTotal)}) must equal bill total (${formatCurrency(totalAmount)})`
      )
      return
    }

    let billDateTime = null
    if (billType === 'previous') {
      const time = billTime || '12:00'
      billDateTime = new Date(`${billDate}T${time}:00`).toISOString()
    }

    const billData = {
      customer_id: selectedCustomer.customer_id,
      branch_id: selectedBranch,
      bill_type: billType,
      bill_date: billDateTime,
      items: cartItems.map((item) => ({
        item_type: item.item_type,
        service_id: item.service_id || null,
        package_id: item.package_id || null,
        product_id: item.product_id || null,
        employee_id: null,
        employee_ids: item.employee_ids.length > 0 ? item.employee_ids : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: parseFloat(
          ((item.unit_price * item.quantity * (item.discount_percent || 0)) / 100).toFixed(2)
        ),
        discount_percentage: item.discount_percent || 0,
        notes: item.source_package_name ? item.item_name : null,
      })),
      payments: validPayments.map((p) => ({
        payment_mode: p.payment_mode,
        amount: parseFloat(p.amount),
      })),
      discount_amount: parseFloat(billDiscount.toFixed(2)),
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

  // Auto-set payment amount when total changes (single payment)
  useEffect(() => {
    if (payments.length === 1 && totalAmount >= 0) {
      setPayments([{ ...payments[0], amount: totalAmount > 0 ? totalAmount.toFixed(2) : '' }])
    }
  }, [totalAmount])

  // Get today's date string for max date on picker
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bills')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-xl font-bold text-gray-900">
          {billType === 'current' ? 'Current Bill' : 'Previous Bill'}
        </h1>
      </div>

      {/* Top Section - Customer, Date */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Customer Search */}
            <div className="flex-1 min-w-[250px] relative">
              <Label className="mb-2 block">Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or phone..."
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
                    <div className="p-4 text-center text-gray-500">No customers found</div>
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

            {/* Branch */}
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

            {/* Date/Time */}
            {billType === 'previous' ? (
              <>
                <div className="w-44">
                  <Label className="mb-2 block flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Date
                  </Label>
                  <Input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    max={todayStr}
                  />
                </div>
                <div className="w-36">
                  <Label className="mb-2 block flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Time
                  </Label>
                  <Input
                    type="time"
                    value={billTime}
                    onChange={(e) => setBillTime(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="w-44">
                <Label className="mb-2 block text-gray-400">Date/Time</Label>
                <div className="h-10 px-3 flex items-center text-sm text-gray-500 bg-gray-50 border rounded-md">
                  {new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Two Panels */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left Panel - Item Selection */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <Tabs
                value={selectedCategory}
                onValueChange={(v) => {
                  setSelectedCategory(v)
                  setSelectedItemId(null)
                  setItemPrice('')
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="services" className="flex-1">
                    Services
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="flex-1">
                    Packages
                  </TabsTrigger>
                  <TabsTrigger value="products" className="flex-1">
                    Products
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 space-y-4">
              {/* Item Dropdown */}
              <div>
                <Label className="mb-2 block">
                  Select{' '}
                  {selectedCategory === 'services'
                    ? 'Service'
                    : selectedCategory === 'packages'
                      ? 'Package'
                      : 'Product'}
                </Label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={selectedItemId || ''}
                  onChange={(e) => handleItemSelect(e.target.value)}
                >
                  <option value="">-- Choose --</option>
                  {itemOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.description ? `[${opt.description}] ` : ''}{opt.name} - {formatCurrency(opt.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Details */}
              {selectedItem && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3 border">
                  <div>
                    <div className="font-semibold text-lg">{selectedItem.name}</div>
                    {selectedCategory === 'services' && selectedItem.category && (
                      <div className="text-sm text-gray-500">
                        Category: {selectedItem.category}
                        {selectedItem.duration && ` | Duration: ${selectedItem.duration} min`}
                      </div>
                    )}
                    {selectedCategory === 'products' && (
                      <div className="text-sm text-gray-500">
                        {selectedItem.brand && `Brand: ${selectedItem.brand} | `}
                        Stock: {selectedItem.stock ?? 'N/A'}
                      </div>
                    )}
                    {selectedCategory === 'packages' && (
                      <div className="text-sm text-gray-500">
                        {selectedItem.description && (
                          <span className="text-primary font-medium">{selectedItem.description}</span>
                        )}
                        {selectedItem.savings > 0 && (
                          <span className="text-green-600 ml-2">
                            Save {formatCurrency(selectedItem.savings)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label className="mb-1 block text-sm">Price</Label>
                      <Input
                        type="number"
                        min="0"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                      />
                    </div>
                    {selectedCategory !== 'packages' && (
                      <div className="w-24">
                        <Label className="mb-1 block text-sm">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Package services list with employee assignment */}
                  {selectedCategory === 'packages' && selectedItem.services?.length > 0 && (
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-2">Services & Employee Assignment:</p>
                      <div className="space-y-2">
                        {selectedItem.services.map((ps, idx) => (
                          <div key={ps.service_id} className="flex items-center gap-2 p-2 bg-white rounded border">
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-700 truncate">{ps.service_name}</div>
                              <div className="text-xs text-gray-400">x{ps.quantity} - {formatCurrency(ps.service_price)}</div>
                            </div>
                            <select
                              className="h-8 px-2 text-xs border rounded-md min-w-[120px]"
                              value={(componentEmployees[idx] || [])[0] || ''}
                              onChange={(e) => {
                                setComponentEmployees((prev) => ({
                                  ...prev,
                                  [idx]: e.target.value ? [e.target.value] : [],
                                }))
                              }}
                            >
                              <option value="">Employee</option>
                              {employees.map((emp) => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                  {emp.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Flat package — show parsed components with employee assignment */}
                  {selectedCategory === 'packages' &&
                    (!selectedItem.services || selectedItem.services.length === 0) && (() => {
                      const components = selectedItem.name
                        .split('+')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0)
                      if (components.length === 0) return null
                      return (
                        <div className="text-sm">
                          <p className="font-medium text-gray-700 mb-2">Services & Employee Assignment:</p>
                          <div className="space-y-2">
                            {components.map((name, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border">
                                <div className="flex-1 min-w-0 text-gray-700 truncate">{name}</div>
                                <select
                                  className="h-8 px-2 text-xs border rounded-md min-w-[120px]"
                                  value={(componentEmployees[idx] || [])[0] || ''}
                                  onChange={(e) => {
                                    setComponentEmployees((prev) => ({
                                      ...prev,
                                      [idx]: e.target.value ? [e.target.value] : [],
                                    }))
                                  }}
                                >
                                  <option value="">Employee</option>
                                  {employees.map((emp) => (
                                    <option key={emp.employee_id} value={emp.employee_id}>
                                      {emp.full_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                  {/* Employee selector for single service/product */}
                  {selectedCategory !== 'packages' && (
                    <div>
                      <Label className="mb-1 block text-sm">Assign Employee (optional)</Label>
                      <select
                        className="w-full h-9 px-3 text-sm border rounded-md"
                        value={(componentEmployees[0] || [])[0] || ''}
                        onChange={(e) => {
                          setComponentEmployees({
                            0: e.target.value ? [e.target.value] : [],
                          })
                        }}
                      >
                        <option value="">-- None --</option>
                        {employees.map((emp) => (
                          <option key={emp.employee_id} value={emp.employee_id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Button className="w-full" onClick={handleAddToCart}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-[420px] flex flex-col">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart
                </span>
                <Badge variant="secondary">{cartItems.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No items in cart</p>
                  <p className="text-sm">Select items from the left panel</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupedCart.map((group) => {
                    if (group.type === 'package') {
                      // Package group
                      return (
                        <div
                          key={group.package_group_id}
                          className="bg-gray-50 rounded-lg border overflow-hidden"
                        >
                          <div className="flex justify-between items-center p-3 bg-gray-100">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Package className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm truncate">
                                {group.package_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-bold text-sm">
                                {formatCurrency(group.total)}
                              </span>
                              {group.discount_percent > 0 && (
                                <span className="text-xs text-red-500">-{group.discount_percent}%</span>
                              )}
                              <button
                                className="p-1 hover:bg-gray-200 rounded"
                                onClick={() => {
                                  setEditingPackageGroupId(group.package_group_id)
                                  setEditingItemIndex(null)
                                  setEditModalOpen(true)
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5 text-gray-500" />
                              </button>
                              <button
                                className="p-1 hover:bg-red-100 rounded"
                                onClick={() => handleRemovePackageGroup(group.package_group_id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                          <div className="px-3 py-2 space-y-1">
                            {group.items.map((gi) => (
                              <div key={gi.cart_id} className="flex items-center justify-between text-xs text-gray-600">
                                <span className="truncate flex-1">{gi.item_name}</span>
                                {gi.employee_ids.length > 0 && (
                                  <div className="flex gap-1 ml-2">
                                    {gi.employee_ids.map((eid) => {
                                      const emp = employees.find((e) => e.employee_id === eid)
                                      return (
                                        <Badge key={eid} variant="secondary" className="text-[10px] px-1 py-0">
                                          {emp?.full_name || '?'}
                                        </Badge>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }

                    // Single item
                    const { item, index } = group
                    return (
                      <div
                        key={item.cart_id}
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group/item"
                        onClick={() => {
                          setEditingItemIndex(index)
                          setEditingPackageGroupId(null)
                          setEditModalOpen(true)
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{item.item_name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatCurrency(item.unit_price)} x {item.quantity}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </div>
                            {item.discount_percent > 0 && (
                              <div className="text-xs text-red-500">-{item.discount_percent}%</div>
                            )}
                            <Pencil className="h-3.5 w-3.5 text-gray-400 ml-auto mt-1 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        {item.employee_ids?.length > 0 && (
                          <div className="mt-1.5 flex gap-1 flex-wrap">
                            {item.employee_ids.map((eid) => {
                              const emp = employees.find((e) => e.employee_id === eid)
                              return (
                                <Badge key={eid} variant="secondary" className="text-xs">
                                  {emp?.full_name || 'Unknown'}
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>

          </Card>
        </div>
      </div>

      {/* Bottom Checkout Bar */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4">
          <div className="flex gap-6">
            {/* Left: Discount, Payment, Notes */}
            <div className="flex-1 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-sm font-medium flex items-center gap-1 mb-1">
                    <Percent className="h-3.5 w-3.5" /> Discount
                  </Label>
                  <div className="flex gap-2">
                    <div className="w-24 relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="%"
                        value={billDiscountPercent || ''}
                        onChange={(e) =>
                          setBillDiscountPercent(
                            Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                          )
                        }
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        %
                      </span>
                    </div>
                    <Input
                      placeholder="Reason"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="w-48">
                  <Label className="text-sm font-medium mb-1 block">Notes</Label>
                  <Input
                    placeholder="Add notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Split className="h-3.5 w-3.5" /> Payment
                    {payments.length > 1 && ` (${payments.length} splits)`}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddPayment}
                    className="h-6 text-xs px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Split
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
                            onClick={() =>
                              handlePaymentChange(index, 'payment_mode', mode.value)
                            }
                            className={`p-1.5 rounded border transition-colors ${
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
                          onChange={(e) =>
                            handlePaymentChange(index, 'amount', e.target.value)
                          }
                          className="pr-14"
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
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {payments.length > 1 && (
                  <div className="text-xs flex gap-4 mt-1">
                    <span className="text-gray-500">
                      Paid: {formatCurrency(totalPaid)}
                    </span>
                    {remaining !== 0 && (
                      <span
                        className={
                          remaining > 0 ? 'text-red-500' : 'text-green-500'
                        }
                      >
                        {remaining > 0 ? 'Remaining' : 'Excess'}:{' '}
                        {formatCurrency(Math.abs(remaining))}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Summary + Button */}
            <div className="w-72 flex flex-col justify-between border-l pl-6">
              <div className="space-y-1 text-sm">
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
              <Button
                className="w-full h-11 text-base mt-3"
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Complete Bill - {formatCurrency(totalAmount)}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Cart Item Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {/* Package Group Edit */}
          {editingPackageGroupId && (() => {
            const groupItems = cartItems
              .map((ci, i) => ({ ...ci, _index: i }))
              .filter((ci) => ci.package_group_id === editingPackageGroupId)
            if (groupItems.length === 0) return null
            const pkgName = groupItems[0]?.source_package_name
            const pkgTotal = groupItems.reduce((sum, gi) => sum + gi.unit_price * gi.quantity, 0)
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" /> Edit Package
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-lg">{pkgName}</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(pkgTotal)}</span>
                  </div>

                  <div className="w-40">
                    <Label className="mb-1 block">Discount %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={groupItems[0]?.discount_percent || ''}
                      onChange={(e) =>
                        updatePackageGroupDiscount(
                          editingPackageGroupId,
                          Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Services & Employee Assignment</Label>
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {groupItems.map((gi) => (
                        <div key={gi.cart_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                          <div className="flex-1 min-w-0 text-sm truncate">{gi.item_name}</div>
                          <select
                            className="h-8 px-2 text-xs border rounded-md min-w-[130px]"
                            value={(gi.employee_ids || [])[0] || ''}
                            onChange={(e) => {
                              updateCartItem(gi._index, 'employee_ids', e.target.value ? [e.target.value] : [])
                            }}
                          >
                            <option value="">Employee</option>
                            {employees.map((emp) => (
                              <option key={emp.employee_id} value={emp.employee_id}>
                                {emp.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleRemovePackageGroup(editingPackageGroupId)
                        setEditModalOpen(false)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Remove Package
                    </Button>
                    <Button onClick={() => setEditModalOpen(false)}>Done</Button>
                  </DialogFooter>
                </div>
              </>
            )
          })()}

          {/* Single Item Edit */}
          {editingItemIndex !== null && !editingPackageGroupId && cartItems[editingItemIndex] && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="font-medium text-lg">
                  {cartItems[editingItemIndex]?.item_name}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="mb-1 block">Price</Label>
                    <Input
                      type="number"
                      min="0"
                      value={cartItems[editingItemIndex]?.unit_price || ''}
                      onChange={(e) =>
                        updateCartItem(
                          editingItemIndex,
                          'unit_price',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={cartItems[editingItemIndex]?.quantity || 1}
                      onChange={(e) =>
                        updateCartItem(
                          editingItemIndex,
                          'quantity',
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Discount %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={cartItems[editingItemIndex]?.discount_percent || ''}
                      onChange={(e) =>
                        updateCartItem(
                          editingItemIndex,
                          'discount_percent',
                          Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        )
                      }
                    />
                  </div>
                </div>

                {/* Employee assignment */}
                <div>
                  <Label className="mb-2 block">Assign Employees (optional)</Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-auto space-y-1">
                    {employees.length === 0 ? (
                      <p className="text-sm text-gray-500 p-1">No employees available</p>
                    ) : (
                      employees.map((emp) => (
                        <label
                          key={emp.employee_id}
                          className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={(
                              cartItems[editingItemIndex]?.employee_ids || []
                            ).includes(emp.employee_id)}
                            onChange={(e) => {
                              const current =
                                cartItems[editingItemIndex]?.employee_ids || []
                              const updated = e.target.checked
                                ? [...current, emp.employee_id]
                                : current.filter((id) => id !== emp.employee_id)
                              updateCartItem(editingItemIndex, 'employee_ids', updated)
                            }}
                          />
                          <span className="text-sm">{emp.full_name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleRemoveItem(editingItemIndex)
                      setEditModalOpen(false)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                  <Button onClick={() => setEditModalOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BillCreatePage
