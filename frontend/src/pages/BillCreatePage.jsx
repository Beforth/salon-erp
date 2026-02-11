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
  ChevronRight,
  ChevronLeft,
  Star,
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
  const [cartCollapsed, setCartCollapsed] = useState(false)

  // Edit modal
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [editingPackageGroupId, setEditingPackageGroupId] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Checkout
  const [billDiscountPercent, setBillDiscountPercent] = useState(0)
  const [discountReason, setDiscountReason] = useState('')
  const [addDiscountPercent, setAddDiscountPercent] = useState(0)
  const [addDiscountAmount, setAddDiscountAmount] = useState('')
  const [addPackageServiceDiscounts, setAddPackageServiceDiscounts] = useState({}) // { [idx]: { percent: number, amount: string } }
  const [packageGroupSelections, setPackageGroupSelections] = useState({}) // { [packageId]: [ serviceId for group0, ... ] }
  const [payments, setPayments] = useState([{ payment_mode: 'cash', amount: '' }])
  const [notes, setNotes] = useState('')

  // Queries
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => customerService.getCustomers({ search: customerSearch, limit: 10 }),
    enabled: customerSearch.length >= 2,
  })

  const { data: servicesData } = useQuery({
    queryKey: ['services', 'active'],
    queryFn: () => serviceService.getServices({ is_active: 'true' }),
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
        star_points: s.star_points ?? 0,
        is_multi_employee: s.is_multi_employee ?? false,
        employee_count: s.employee_count ?? null,
      }))
    }
    if (selectedCategory === 'packages') {
      return packages.map((p) => ({
        id: p.package_id,
        name: p.package_name,
        price: p.package_price ?? p.individual_price ?? 0,
        description: p.description,
        services: p.services,
        service_groups: p.service_groups,
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

  // Star points for a package service: use package API value, or fallback to services list by service_id
  const getPackageServiceStarPoints = (ps) => {
    const fromPackage = ps.star_points ?? ps.starPoints ?? 0
    if (fromPackage > 0) return fromPackage
    const fromService = services.find((s) => s.service_id === ps.service_id)
    return fromService?.star_points ?? 0
  }

  // Item discount: either fixed amount (discount_amount_override) or percent
  const getItemDiscount = (item) => {
    const lineTotal = item.unit_price * item.quantity
    if (item.discount_amount_override != null && item.discount_amount_override >= 0) {
      return Math.min(Number(item.discount_amount_override), lineTotal)
    }
    return (lineTotal * (item.discount_percent || 0)) / 100
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const itemsDiscount = cartItems.reduce((sum, item) => sum + getItemDiscount(item), 0)
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
    if (item) {
      setItemPrice(item.price.toString())
      if (selectedCategory === 'packages' && item.service_groups?.length) {
        setPackageGroupSelections((prev) => ({
          ...prev,
          [id]: item.service_groups.map((g) => g.services?.[0]?.service_id ?? null),
        }))
      }
    }
    setItemQuantity(1)
  }

  const handleAddToCart = () => {
    if (!selectedItemId || !itemPrice) return

    if (selectedCategory === 'packages') {
      const pkg = selectedItem
      if (!pkg) return

      const standaloneServices = pkg.services || []
      const serviceGroups = pkg.service_groups || []
      const hasGroups = serviceGroups.length > 0

      if (hasGroups) {
        const selections = packageGroupSelections[pkg.id] || []
        const missing = serviceGroups.some((g, i) => !selections[i] && (g.services?.length ?? 0) > 0)
        if (missing) {
          toast.error('Choose one service for each "OR" group before adding to cart')
          return
        }
      }

      if (standaloneServices.length > 0 || hasGroups) {
        const totalIndividualPrice = pkg.individual_price || 0
        const packagePrice = parseFloat(itemPrice) || totalIndividualPrice
        const ratio = totalIndividualPrice > 0 ? packagePrice / totalIndividualPrice : 1
        const groupId = crypto.randomUUID()

        const expanded = []
        let idx = 0
        standaloneServices.forEach((ps) => {
          const d = addPackageServiceDiscounts[idx]
          const useAmount = d?.amount && parseFloat(d.amount) > 0
          expanded.push({
            cart_id: crypto.randomUUID(),
            item_type: 'service',
            service_id: ps.service_id,
            item_name: ps.service_name,
            unit_price: parseFloat((ps.service_price * ratio).toFixed(2)),
            quantity: ps.quantity,
            employee_ids: (componentEmployees[idx] || []).filter(Boolean),
            employee_id: null,
            discount_percent: useAmount ? 0 : (d?.percent ?? 0),
            discount_amount_override: useAmount ? parseFloat(d.amount) : undefined,
            star_points: getPackageServiceStarPoints(ps),
            source_package_id: pkg.id,
            source_package_name: pkg.name,
            source_individual_price: totalIndividualPrice,
            package_group_id: groupId,
            is_multi_employee: ps.is_multi_employee ?? false,
            employee_count: ps.employee_count ?? null,
            item_status: 'completed',
          })
          idx += 1
        })
        serviceGroups.forEach((g, gi) => {
          const selectedId = (packageGroupSelections[pkg.id] || [])[gi]
          const chosen = (g.services || []).find((s) => s.service_id === selectedId)
          if (chosen) {
            const d = addPackageServiceDiscounts[idx]
            const useAmount = d?.amount && parseFloat(d.amount) > 0
            expanded.push({
              cart_id: crypto.randomUUID(),
              item_type: 'service',
              service_id: chosen.service_id,
              item_name: chosen.service_name,
              unit_price: parseFloat((chosen.service_price * ratio).toFixed(2)),
              quantity: chosen.quantity,
              employee_ids: (componentEmployees[idx] || []).filter(Boolean),
              employee_id: null,
              discount_percent: useAmount ? 0 : (d?.percent ?? 0),
              discount_amount_override: useAmount ? parseFloat(d.amount) : undefined,
              star_points: getPackageServiceStarPoints(chosen),
              source_package_id: pkg.id,
              source_package_name: pkg.name,
              source_individual_price: totalIndividualPrice,
              package_group_id: groupId,
              is_multi_employee: chosen.is_multi_employee ?? false,
              employee_count: chosen.employee_count ?? null,
              item_status: 'completed',
            })
            idx += 1
          }
        })
        setCartItems([...cartItems, ...expanded])
      } else {
        // Flat package — parse name by "+" to extract components
        const totalIndividualPrice = pkg.individual_price || 0
        const packagePrice = parseFloat(itemPrice) || totalIndividualPrice
        const components = pkg.name
          .split('+')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

        const flatGroupId = crypto.randomUUID()

        if (components.length <= 1) {
          // Single component or unparseable — add as single item
          const d = addPackageServiceDiscounts[0]
          const useAmount = d?.amount && parseFloat(d.amount) > 0
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
              discount_percent: useAmount ? 0 : (d?.percent ?? 0),
              discount_amount_override: useAmount ? parseFloat(d.amount) : undefined,
              source_package_name: pkg.name,
              source_individual_price: totalIndividualPrice,
              package_group_id: flatGroupId,
              item_status: 'completed',
            },
          ])
        } else {
          // Split price equally across components — discount per component
          const pricePerComponent = parseFloat((packagePrice / components.length).toFixed(2))
          const lastPrice = parseFloat(
            (packagePrice - pricePerComponent * (components.length - 1)).toFixed(2)
          )

          const expandedItems = components.map((name, idx) => {
            const d = addPackageServiceDiscounts[idx]
            const useAmount = d?.amount && parseFloat(d.amount) > 0
            return {
              cart_id: crypto.randomUUID(),
              item_type: 'package',
              package_id: selectedItemId,
              item_name: name,
              unit_price: idx === components.length - 1 ? lastPrice : pricePerComponent,
              quantity: 1,
              employee_ids: componentEmployees[idx] || [],
              employee_id: null,
              discount_percent: useAmount ? 0 : (d?.percent ?? 0),
              discount_amount_override: useAmount ? parseFloat(d.amount) : undefined,
              source_package_name: pkg.name,
              source_individual_price: totalIndividualPrice,
              package_group_id: flatGroupId,
              item_status: 'completed',
            }
          })
          setCartItems([...cartItems, ...expandedItems])
        }
      }
    } else if (selectedCategory === 'services') {
      const empIds = (componentEmployees[0] || []).filter(Boolean)
      setCartItems([
        ...cartItems,
        {
          cart_id: crypto.randomUUID(),
          item_type: 'service',
          service_id: selectedItemId,
          item_name: selectedItem?.name || '',
          unit_price: parseFloat(itemPrice),
          quantity: itemQuantity,
          employee_ids: empIds,
          employee_id: null,
          star_points: selectedItem?.star_points ?? 0,
          discount_percent: parseFloat(addDiscountAmount) > 0 ? 0 : addDiscountPercent,
          discount_amount_override: parseFloat(addDiscountAmount) > 0 ? parseFloat(addDiscountAmount) : undefined,
          is_multi_employee: selectedItem?.is_multi_employee ?? false,
          employee_count: selectedItem?.employee_count ?? null,
          item_status: 'completed',
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
          employee_ids: (componentEmployees[0] || []).filter(Boolean),
          employee_id: null,
          discount_percent: parseFloat(addDiscountAmount) > 0 ? 0 : addDiscountPercent,
          discount_amount_override: parseFloat(addDiscountAmount) > 0 ? parseFloat(addDiscountAmount) : undefined,
          item_status: 'completed',
        },
      ])
    }

    // Reset selection
    setSelectedItemId(null)
    setItemPrice('')
    setItemQuantity(1)
    setAddDiscountPercent(0)
    setAddDiscountAmount('')
    setAddPackageServiceDiscounts({})
    setComponentEmployees({})
  }

  const updateCartItem = (index, field, value) => {
    setCartItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const toggleItemPending = (index) => {
    setCartItems((items) =>
      items.map((item, i) =>
        i === index
          ? { ...item, item_status: item.item_status === 'pending' ? 'completed' : 'pending' }
          : item
      )
    )
  }

  const setPackageGroupPending = (groupId, pending) => {
    const nextStatus = pending ? 'pending' : 'completed'
    setCartItems((items) =>
      items.map((item) =>
        item.package_group_id === groupId ? { ...item, item_status: nextStatus } : item
      )
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
        item.package_group_id === groupId
          ? { ...item, discount_percent: discountPercent, discount_amount_override: undefined }
          : item
      )
    )
  }

  const updatePackageGroupDiscountAmount = (groupId, amount) => {
    const num = parseFloat(amount)
    if (!Number.isFinite(num) || num <= 0) {
      setCartItems((items) =>
        items.map((item) =>
          item.package_group_id === groupId
            ? { ...item, discount_amount_override: undefined }
            : item
        )
      )
      return
    }
    setCartItems((items) => {
      const groupItems = items.filter((i) => i.package_group_id === groupId)
      const groupSubtotal = groupItems.reduce((s, gi) => s + gi.unit_price * gi.quantity, 0)
      const totalAmount = Math.min(num, groupSubtotal)
      return items.map((item) => {
        if (item.package_group_id !== groupId) return item
        const itemSubtotal = item.unit_price * item.quantity
        const proportion = groupSubtotal > 0 ? itemSubtotal / groupSubtotal : 0
        return {
          ...item,
          discount_amount_override: totalAmount * proportion,
          discount_percent: 0,
        }
      })
    })
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
        const groupSubtotal = groupItems.reduce((sum, gi) => sum + gi.unit_price * gi.quantity, 0)
        const groupDiscountTotal = groupItems.reduce(
          (sum, gi) => sum + getItemDiscount(gi),
          0
        )
        const groupTotal = groupSubtotal - groupDiscountTotal
        const groupIndividualPrice = groupItems[0]?.source_individual_price
        const groupSavings = groupIndividualPrice != null && groupIndividualPrice > groupTotal
          ? groupIndividualPrice - groupTotal
          : 0
        groups.push({
          type: 'package',
          package_group_id: item.package_group_id,
          package_name: item.source_package_name,
          items: groupItems,
          total: groupTotal,
          groupSubtotal: groupSubtotal,
          groupDiscountTotal,
          discount_percent: groupItems[0]?.discount_percent || 0,
          individual_price: groupIndividualPrice,
          savings: groupSavings,
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
        employee_ids: (item.employee_ids || []).filter(Boolean).length > 0 ? (item.employee_ids || []).filter(Boolean) : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: parseFloat(getItemDiscount(item).toFixed(2)),
        discount_percentage:
          item.unit_price * item.quantity > 0
            ? parseFloat(
                ((getItemDiscount(item) / (item.unit_price * item.quantity)) * 100).toFixed(2)
              )
            : 0,
        notes: item.source_package_name ? item.item_name : null,
        status: item.item_status === 'pending' ? 'pending' : 'completed',
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

  // Default OR group selections when a package with service_groups is selected (e.g. after branch switch)
  useEffect(() => {
    if (selectedCategory !== 'packages' || !selectedItemId || !selectedItem?.service_groups?.length) return
    const current = packageGroupSelections[selectedItemId] || []
    const defaults = selectedItem.service_groups.map((g, i) => current[i] ?? g.services?.[0]?.service_id ?? null)
    if (defaults.some((d, i) => d !== current[i])) {
      setPackageGroupSelections((prev) => ({ ...prev, [selectedItemId]: defaults }))
    }
  }, [selectedCategory, selectedItemId, selectedItem?.service_groups, packageGroupSelections])

  // Auto-set payment amount when total changes (single payment)
  useEffect(() => {
    if (payments.length === 1 && totalAmount >= 0) {
      setPayments([{ ...payments[0], amount: totalAmount > 0 ? totalAmount.toFixed(2) : '' }])
    }
  }, [totalAmount])

  // Get today's date string for max date on picker
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-4 min-h-0">
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
                      {selectedCategory === 'services' && opt.star_points != null && opt.star_points > 0 ? ` (⭐ ${opt.star_points})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Details */}
              {selectedItem && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3 border">
                  <div>
                    <div className="font-semibold text-lg">{selectedItem.name}</div>
                    {selectedCategory === 'services' && (
                      <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {selectedItem.category && <span>Category: {selectedItem.category}</span>}
                        {selectedItem.duration != null && <span>Duration: {selectedItem.duration} min</span>}
                        {(selectedItem.star_points ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Star className="h-3.5 w-3.5 fill-amber-500" />
                            {selectedItem.star_points} stars
                          </span>
                        )}
                      </div>
                    )}
                    {selectedCategory === 'products' && (
                      <div className="text-sm text-gray-500">
                        {selectedItem.brand && `Brand: ${selectedItem.brand} | `}
                        Stock: {selectedItem.stock ?? 'N/A'}
                      </div>
                    )}
                    {selectedCategory === 'packages' && (
                      <div className="text-sm text-gray-500 space-y-1">
                        {selectedItem.description && (
                          <span className="text-primary font-medium">{selectedItem.description}</span>
                        )}
                        {selectedItem.service_groups?.length > 0 && (
                          <p className="text-amber-700 font-medium">
                            Choose one service per group below before adding to cart.
                          </p>
                        )}
                        {(() => {
                          const ind = selectedItem.individual_price || 0
                          const current = parseFloat(itemPrice) || 0
                          const savings = ind - current
                          return savings > 0 ? (
                            <span className="text-green-600 ml-2">
                              Save {formatCurrency(savings)}
                            </span>
                          ) : null
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[100px]">
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
                    <div className="w-24">
                      <Label className="mb-1 block text-sm">Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={addDiscountPercent || ''}
                        onChange={(e) => {
                          setAddDiscountPercent(
                            Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                          )
                          setAddDiscountAmount('')
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="mb-1 block text-sm">Discount ₹</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={addDiscountAmount}
                        onChange={(e) => {
                          const v = e.target.value
                          setAddDiscountAmount(v)
                          if (parseFloat(v) > 0) setAddDiscountPercent(0)
                        }}
                      />
                    </div>
                  </div>

                  {/* OR groups: choose one service per group — show first so it's always visible */}
                  {selectedCategory === 'packages' && selectedItem.service_groups?.length > 0 && (
                    <div className="text-sm space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="font-semibold text-amber-800">Choose one option per group</p>
                      <p className="text-xs text-amber-700">Select one service from each group below. You must pick one per group before adding to cart.</p>
                      {selectedItem.service_groups.map((group, groupIdx) => {
                        const selectedId = (packageGroupSelections[selectedItemId] || [])[groupIdx]
                        const groupServices = group.services || []
                        return (
                          <div key={group.group_id || groupIdx} className="p-2 bg-white rounded border border-amber-100">
                            <Label className="text-xs font-medium text-gray-700">{group.group_label || `Group ${groupIdx + 1}`}</Label>
                            <select
                              className="mt-1.5 w-full h-9 px-2 border rounded-md text-sm border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              value={selectedId || ''}
                              onChange={(e) => {
                                const sid = e.target.value || null
                                setPackageGroupSelections((prev) => {
                                  const arr = [...(prev[selectedItemId] || [])]
                                  while (arr.length <= groupIdx) arr.push(null)
                                  arr[groupIdx] = sid
                                  return { ...prev, [selectedItemId]: arr }
                                })
                              }}
                            >
                              <option value="">— Select one —</option>
                              {groupServices.map((s) => (
                                <option key={s.service_id} value={s.service_id}>
                                  {s.service_name} — {formatCurrency(s.service_price)}{getPackageServiceStarPoints(s) > 0 ? ` (⭐ ${getPackageServiceStarPoints(s)})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Package services list with employee assignment */}
                  {selectedCategory === 'packages' && selectedItem.services?.length > 0 && (
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-2">Services — discount & employees (per service):</p>
                      <div className="space-y-2">
                        {selectedItem.services.map((ps, idx) => {
                          const slots = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                          const d = addPackageServiceDiscounts[idx] || { percent: 0, amount: '' }
                          return (
                            <div key={ps.service_id} className="p-2 bg-white rounded border space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <div className="text-gray-700 truncate flex items-center gap-1.5 flex-wrap">
                                    {ps.service_name}
                                    <span className="inline-flex items-center text-amber-600 text-xs shrink-0">
                                      <Star className="h-3 w-3 fill-amber-500" />
                                      {getPackageServiceStarPoints(ps)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-400">x{ps.quantity} - {formatCurrency(ps.service_price)}</div>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Discount %</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    className="h-7 w-14 text-xs px-1.5"
                                    value={d.amount ? '' : (d.percent ?? '')}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                      setAddPackageServiceDiscounts((prev) => ({
                                        ...prev,
                                        [idx]: { ...prev[idx], percent: v, amount: '' },
                                      }))
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Discount ₹</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    className="h-7 w-14 text-xs px-1.5"
                                    value={d.amount}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const v = e.target.value
                                      setAddPackageServiceDiscounts((prev) => ({
                                        ...prev,
                                        [idx]: { ...prev[idx], amount: v, percent: v ? 0 : (prev[idx]?.percent ?? 0) },
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {slots.map((_, slotIdx) => (
                                  <div key={slotIdx} className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400">E{slotIdx + 1}</span>
                                    <select
                                      className="h-8 px-2 text-xs border rounded-md min-w-[100px]"
                                      value={(componentEmployees[idx] || [])[slotIdx] || ''}
                                      onChange={(e) => {
                                        const current = [...(componentEmployees[idx] || [])]
                                        while (current.length <= slotIdx) current.push('')
                                        current[slotIdx] = e.target.value || ''
                                        setComponentEmployees((prev) => ({ ...prev, [idx]: current }))
                                      }}
                                    >
                                      <option value="">—</option>
                                      {employees.map((emp) => (
                                        <option key={emp.employee_id} value={emp.employee_id}>
                                          {emp.full_name}
                                        </option>
                                      ))}
                                    </select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700"
                                      onClick={() => {
                                        const current = [...(componentEmployees[idx] || [])]
                                        const next = current.filter((_, i) => i !== slotIdx)
                                        setComponentEmployees((prev) => ({ ...prev, [idx]: next.length ? next : [''] }))
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    const current = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                                    setComponentEmployees((prev) => ({ ...prev, [idx]: [...current, ''] }))
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* OR group selections: discount & employees for chosen service per group */}
                  {selectedCategory === 'packages' &&
                    selectedItem.service_groups?.length > 0 &&
                    (() => {
                      const standaloneLen = (selectedItem.services || []).length
                      return (
                        <div className="text-sm">
                          <p className="font-medium text-gray-700 mb-2">OR group choices — discount & employees:</p>
                          <div className="space-y-2">
                            {selectedItem.service_groups.map((group, groupIdx) => {
                              const selectedId = (packageGroupSelections[selectedItemId] || [])[groupIdx]
                              const chosen = (group.services || []).find((s) => s.service_id === selectedId)
                              const idx = standaloneLen + groupIdx
                              const slots = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                              const d = addPackageServiceDiscounts[idx] || { percent: 0, amount: '' }
                              if (!chosen) return null
                              return (
                                <div key={group.group_id || groupIdx} className="p-2 bg-white rounded border space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                      <div className="text-gray-700 truncate flex items-center gap-1.5 flex-wrap">
                                        {chosen.service_name}
                                        <span className="inline-flex items-center text-amber-600 text-xs shrink-0">
                                          <Star className="h-3 w-3 fill-amber-500" />
                                          {getPackageServiceStarPoints(chosen)}
                                        </span>
                                        <span className="text-xs text-gray-400">({group.group_label})</span>
                                      </div>
                                      <div className="text-xs text-gray-400">x{chosen.quantity} — {formatCurrency(chosen.service_price)}</div>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-500">Discount %</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        className="h-7 w-14 text-xs px-1.5"
                                        value={d.amount ? '' : (d.percent ?? '')}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                          setAddPackageServiceDiscounts((prev) => ({
                                            ...prev,
                                            [idx]: { ...prev[idx], percent: v, amount: '' },
                                          }))
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-500">Discount ₹</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        className="h-7 w-14 text-xs px-1.5"
                                        value={d.amount}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const v = e.target.value
                                          setAddPackageServiceDiscounts((prev) => ({
                                            ...prev,
                                            [idx]: { ...prev[idx], amount: v, percent: v ? 0 : (prev[idx]?.percent ?? 0) },
                                          }))
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {slots.map((_, slotIdx) => (
                                      <div key={slotIdx} className="flex items-center gap-1">
                                        <span className="text-xs text-gray-400">E{slotIdx + 1}</span>
                                        <select
                                          className="h-8 px-2 text-xs border rounded-md min-w-[100px]"
                                          value={(componentEmployees[idx] || [])[slotIdx] || ''}
                                          onChange={(e) => {
                                            const current = [...(componentEmployees[idx] || [])]
                                            while (current.length <= slotIdx) current.push('')
                                            current[slotIdx] = e.target.value || ''
                                            setComponentEmployees((prev) => ({ ...prev, [idx]: current }))
                                          }}
                                        >
                                          <option value="">—</option>
                                          {employees.map((emp) => (
                                            <option key={emp.employee_id} value={emp.employee_id}>
                                              {emp.full_name}
                                            </option>
                                          ))}
                                        </select>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700"
                                          onClick={() => {
                                            const current = [...(componentEmployees[idx] || [])]
                                            const next = current.filter((_, i) => i !== slotIdx)
                                            setComponentEmployees((prev) => ({ ...prev, [idx]: next.length ? next : [''] }))
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => {
                                        const current = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                                        setComponentEmployees((prev) => ({ ...prev, [idx]: [...current, ''] }))
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                  {/* Flat package — show parsed components with employee assignment */}
                  {selectedCategory === 'packages' &&
                    (!selectedItem.services || selectedItem.services.length === 0) &&
                    !(selectedItem.service_groups?.length > 0) && (() => {
                      const components = selectedItem.name
                        .split('+')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0)
                      if (components.length === 0) return null
                      return (
                        <div className="text-sm">
                          <p className="font-medium text-gray-700 mb-2">Components — discount & employees (per item):</p>
                          <div className="space-y-2">
                            {components.map((name, idx) => {
                              const slots = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                              const d = addPackageServiceDiscounts[idx] || { percent: 0, amount: '' }
                              return (
                                <div key={idx} className="p-2 bg-white rounded border space-y-2">
                                  <div className="text-gray-700 truncate font-medium">{name}</div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-500">%</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        className="h-7 w-14 text-xs px-1.5"
                                        value={d.amount ? '' : (d.percent ?? '')}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                          setAddPackageServiceDiscounts((prev) => ({
                                            ...prev,
                                            [idx]: { ...prev[idx], percent: v, amount: '' },
                                          }))
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-500">₹</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        className="h-7 w-14 text-xs px-1.5"
                                        value={d.amount}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const v = e.target.value
                                          setAddPackageServiceDiscounts((prev) => ({
                                            ...prev,
                                            [idx]: { ...prev[idx], amount: v, percent: v ? 0 : (prev[idx]?.percent ?? 0) },
                                          }))
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {slots.map((_, slotIdx) => (
                                      <div key={slotIdx} className="flex items-center gap-1">
                                        <span className="text-xs text-gray-400">E{slotIdx + 1}</span>
                                        <select
                                          className="h-8 px-2 text-xs border rounded-md min-w-[100px]"
                                          value={(componentEmployees[idx] || [])[slotIdx] || ''}
                                          onChange={(e) => {
                                            const current = [...(componentEmployees[idx] || [])]
                                            while (current.length <= slotIdx) current.push('')
                                            current[slotIdx] = e.target.value || ''
                                            setComponentEmployees((prev) => ({ ...prev, [idx]: current }))
                                          }}
                                        >
                                          <option value="">—</option>
                                          {employees.map((emp) => (
                                            <option key={emp.employee_id} value={emp.employee_id}>
                                              {emp.full_name}
                                            </option>
                                          ))}
                                        </select>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 shrink-0 text-red-500"
                                          onClick={() => {
                                            const current = [...(componentEmployees[idx] || [])]
                                            const next = current.filter((_, i) => i !== slotIdx)
                                            setComponentEmployees((prev) => ({ ...prev, [idx]: next.length ? next : [''] }))
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => {
                                        const current = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                                        setComponentEmployees((prev) => ({ ...prev, [idx]: [...current, ''] }))
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                  {/* Employee selector for single service/product — multiple employees allowed for any item */}
                  {selectedCategory !== 'packages' && (
                    <div>
                      <Label className="mb-1 block text-sm flex items-center gap-2">
                        Assign Employee(s) (optional)
                        {selectedCategory === 'services' && (selectedItem?.star_points ?? 0) > 0 && (
                          <span className="inline-flex items-center text-amber-600 text-xs font-normal">
                            <Star className="h-3 w-3 fill-amber-500 mr-0.5" />
                            {selectedItem.star_points} stars
                          </span>
                        )}
                      </Label>
                      <div className="space-y-2">
                        {((componentEmployees[0] || []).length ? componentEmployees[0] : ['']).map((_, slotIdx) => (
                          <div key={slotIdx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-20 shrink-0">
                              Employee {slotIdx + 1}
                            </span>
                            <select
                              className="flex-1 h-9 px-3 text-sm border rounded-md min-w-0"
                              value={((componentEmployees[0] || [])[slotIdx] || '').toString()}
                              onChange={(e) => {
                                const current = [...(componentEmployees[0] || [])]
                                while (current.length <= slotIdx) current.push('')
                                current[slotIdx] = e.target.value || ''
                                setComponentEmployees({ 0: current })
                              }}
                            >
                              <option value="">-- None --</option>
                              {employees.map((emp) => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                  {emp.full_name}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                const current = [...(componentEmployees[0] || [])]
                                const next = current.filter((_, i) => i !== slotIdx)
                                setComponentEmployees({ 0: next.length ? next : [''] })
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setComponentEmployees({
                              0: [...((componentEmployees[0] || []).length ? componentEmployees[0] : ['']), ''],
                            })
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add employee
                        </Button>
                      </div>
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

        {/* Right Panel - Cart (collapsible sidebar) */}
        <div
          className={`flex flex-col flex-shrink-0 transition-[width] duration-200 ease-in-out ${
            cartCollapsed ? 'w-14' : 'w-[420px]'
          }`}
        >
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-2 flex flex-row items-center gap-0 p-0 min-h-0">
              {cartCollapsed ? (
                <div className="flex flex-col items-center w-14 py-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCartCollapsed(false)}
                    className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                    title="Expand cart"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <ShoppingCart className="h-5 w-5 text-gray-600" />
                  <Badge variant="secondary" className="text-xs w-6 h-6 flex items-center justify-center p-0">
                    {cartItems.length}
                  </Badge>
                </div>
              ) : (
                <>
                  <CardTitle className="flex items-center justify-between flex-1 py-3 px-4">
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Cart
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{cartItems.length} items</Badge>
                      <button
                        type="button"
                        onClick={() => setCartCollapsed(true)}
                        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                        title="Collapse cart"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>
                  </CardTitle>
                </>
              )}
            </CardHeader>
            {!cartCollapsed && (
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
                      // Package group — discount per service, not on package
                      return (
                        <div
                          key={group.package_group_id}
                          className="bg-gray-50 rounded-lg border overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-100">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Package className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm truncate">
                                {group.package_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                              {group.items.every((gi) => gi.item_status === 'pending') ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setPackageGroupPending(group.package_group_id, false)}
                                >
                                  Mark done
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-amber-700 border-amber-300"
                                  onClick={() => setPackageGroupPending(group.package_group_id, true)}
                                >
                                  Mark pending
                                </Button>
                              )}
                              {group.savings > 0 && (
                                <span className="text-xs text-green-600 font-medium">
                                  Save {formatCurrency(group.savings)}
                                </span>
                              )}
                              <span className="font-bold text-sm">
                                {formatCurrency(group.total)}
                              </span>
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
                          <div className="px-3 py-2 space-y-2">
                            <p className="text-[10px] text-gray-500 px-1">
                              Mark whole package above, or mark each service below:
                            </p>
                            {group.items.map((gi) => {
                              const lineTotal = gi.unit_price * gi.quantity
                              const lineDiscount = getItemDiscount(gi)
                              const lineNet = lineTotal - lineDiscount
                              return (
                                <div
                                  key={gi.cart_id}
                                  className="p-2 bg-white rounded border text-xs"
                                >
                                  <div className="font-medium text-gray-700 truncate mb-1.5 flex items-center gap-1.5 flex-wrap">
                                    {gi.item_name}
                                    <span className="inline-flex items-center text-amber-600 text-xs font-normal shrink-0">
                                      <Star className="h-3 w-3 fill-amber-500" />
                                      {gi.star_points ?? gi.starPoints ?? 0}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap mt-1">
                                    <span className="text-gray-400 text-[10px]">This service:</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleItemPending(gi._index)}
                                      className={`shrink-0 text-xs px-2 py-1 rounded border font-medium ${
                                        gi.item_status === 'pending'
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50'
                                      }`}
                                    >
                                      {gi.item_status === 'pending' ? 'Pending' : 'Done'}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                    <span className="text-gray-500">
                                      {formatCurrency(gi.unit_price)} × {gi.quantity}
                                    </span>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-gray-400">%</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        className="h-6 w-12 text-xs px-1"
                                        value={gi.discount_amount_override != null ? '' : (gi.discount_percent ?? '')}
                                        placeholder={gi.discount_amount_override != null ? '—' : '0'}
                                        onChange={(e) => {
                                          const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                          setCartItems((items) =>
                                            items.map((it, i) =>
                                              i === gi._index
                                                ? { ...it, discount_percent: v, discount_amount_override: undefined }
                                                : it
                                            )
                                          )
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-gray-400">₹</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        className="h-6 w-12 text-xs px-1"
                                        value={gi.discount_amount_override != null ? gi.discount_amount_override : ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const v = e.target.value
                                          const num = parseFloat(v)
                                          setCartItems((items) =>
                                            items.map((it, i) =>
                                              i === gi._index
                                                ? {
                                                    ...it,
                                                    discount_amount_override:
                                                      v === '' || !Number.isFinite(num) ? undefined : Math.max(0, num),
                                                    discount_percent: v === '' || !Number.isFinite(num) ? it.discount_percent : 0,
                                                  }
                                                : it
                                            )
                                          )
                                        }}
                                      />
                                    </div>
                                    <span className="font-semibold text-gray-800">
                                      {formatCurrency(lineNet)}
                                      {lineDiscount > 0 && (
                                        <span className="text-red-500 font-normal ml-0.5">
                                          (-{formatCurrency(lineDiscount)})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  {gi.employee_ids?.length > 0 && (
                                    <div className="flex gap-1 flex-wrap mt-1">
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
                              )
                            })}
                          </div>
                        </div>
                      )
                    }

                    // Single item — line shows price, qty, discount % or ₹ (editable), total
                    const { item, index } = group
                    const lineTotal = item.unit_price * item.quantity
                    const lineDiscount = getItemDiscount(item)
                    const lineNet = lineTotal - lineDiscount
                    return (
                      <div
                        key={item.cart_id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group/item"
                      >
                        <div className="font-medium text-sm truncate mb-2 flex items-center gap-1.5 flex-wrap">
                          {item.item_name}
                          {(item.star_points ?? 0) > 0 && (
                            <span className="inline-flex items-center text-amber-600 text-xs font-normal shrink-0">
                              <Star className="h-3 w-3 fill-amber-500" />
                              {item.star_points}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleItemPending(index)}
                            className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${
                              item.item_status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-amber-50'
                            }`}
                          >
                            {item.item_status === 'pending' ? 'Pending' : 'Done'}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <span className="text-gray-500">
                            {formatCurrency(item.unit_price)} × {item.quantity}
                          </span>
                          <span className="text-gray-400">|</span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-gray-500 text-xs">%</span>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              className="h-7 w-14 text-xs px-1.5"
                              value={item.discount_amount_override != null ? '' : (item.discount_percent ?? '')}
                              placeholder={item.discount_amount_override != null ? '—' : '0'}
                              onChange={(e) => {
                                const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                setCartItems((items) =>
                                  items.map((it, i) =>
                                    i === index
                                      ? { ...it, discount_percent: v, discount_amount_override: undefined }
                                      : it
                                  )
                                )
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-gray-500 text-xs">₹</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              className="h-7 w-14 text-xs px-1.5"
                              value={item.discount_amount_override != null ? item.discount_amount_override : ''}
                              placeholder="0"
                              onChange={(e) => {
                                const v = e.target.value
                                const num = parseFloat(v)
                                setCartItems((items) =>
                                  items.map((it, i) =>
                                    i === index
                                      ? {
                                          ...it,
                                          discount_amount_override:
                                            v === '' || !Number.isFinite(num) ? undefined : Math.max(0, num),
                                          discount_percent:
                                            v === '' || !Number.isFinite(num) ? it.discount_percent : 0,
                                        }
                                      : it
                                  )
                                )
                              }}
                            />
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(lineNet)}
                            {lineDiscount > 0 && (
                              <span className="text-xs text-red-500 font-normal ml-1">
                                (-{formatCurrency(lineDiscount)})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          {item.employee_ids?.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {item.employee_ids.map((eid) => {
                                const emp = employees.find((e) => e.employee_id === eid)
                                return (
                                  <Badge key={eid} variant="secondary" className="text-xs">
                                    {emp?.full_name || 'Unknown'}
                                  </Badge>
                                )
                              })}
                            </div>
                          ) : (
                            <span />
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1 hover:bg-gray-200 rounded"
                              onClick={() => {
                                setEditingItemIndex(index)
                                setEditingPackageGroupId(null)
                                setEditModalOpen(true)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 text-gray-500" />
                            </button>
                            <button
                              type="button"
                              className="p-1 hover:bg-red-100 rounded"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
            )}
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

                  <div>
                    <Label className="mb-2 block">Services — discount & employees (per service)</Label>
                    <div className="space-y-2 max-h-60 overflow-auto">
                          {groupItems.map((gi) => {
                        const currentIds = gi.employee_ids || []
                        const slots = currentIds.length ? currentIds : ['']
                        return (
                          <div key={gi.cart_id} className="p-2 bg-gray-50 rounded border space-y-2">
                            <div className="text-sm font-medium truncate flex items-center gap-1.5 flex-wrap">
                              {gi.item_name}
                              <span className="inline-flex items-center text-amber-600 text-xs font-normal shrink-0">
                                <Star className="h-3 w-3 fill-amber-500" />
                                {gi.star_points ?? gi.starPoints ?? 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-xs text-gray-500">Status</Label>
                              <button
                                type="button"
                                onClick={() => toggleItemPending(gi._index)}
                                className={`text-xs px-2 py-1 rounded border font-medium ${
                                  gi.item_status === 'pending'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50'
                                }`}
                              >
                                {gi.item_status === 'pending' ? 'Pending' : 'Done'}
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Label className="text-xs text-gray-500">Discount %</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="h-7 w-14 text-xs"
                                  value={gi.discount_amount_override != null ? '' : (gi.discount_percent ?? '')}
                                  placeholder={gi.discount_amount_override != null ? '—' : '0'}
                                  onChange={(e) => {
                                    const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                    setCartItems((items) =>
                                      items.map((it, i) =>
                                        i === gi._index
                                          ? { ...it, discount_percent: v, discount_amount_override: undefined }
                                          : it
                                      )
                                    )
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <Label className="text-xs text-gray-500">Discount ₹</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  className="h-7 w-14 text-xs"
                                  value={gi.discount_amount_override != null ? gi.discount_amount_override : ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const v = e.target.value
                                    const num = parseFloat(v)
                                    setCartItems((items) =>
                                      items.map((it, i) =>
                                        i === gi._index
                                          ? {
                                              ...it,
                                              discount_amount_override:
                                                v === '' || !Number.isFinite(num) ? undefined : Math.max(0, num),
                                              discount_percent: v === '' || !Number.isFinite(num) ? it.discount_percent : 0,
                                            }
                                          : it
                                      )
                                    )
                                  }}
                                />
                              </div>
                            </div>
                            {slots.map((eid, slotIdx) => (
                              <div key={slotIdx} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-16 shrink-0">E{slotIdx + 1}</span>
                                <select
                                  className="flex-1 h-8 px-2 text-xs border rounded-md min-w-0"
                                  value={(currentIds[slotIdx] || '').toString()}
                                  onChange={(e) => {
                                    const updated = [...currentIds]
                                    while (updated.length <= slotIdx) updated.push('')
                                    updated[slotIdx] = e.target.value || ''
                                    updateCartItem(gi._index, 'employee_ids', updated)
                                  }}
                                >
                                  <option value="">— None —</option>
                                  {employees.map((emp) => (
                                    <option key={emp.employee_id} value={emp.employee_id}>
                                      {emp.full_name}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 text-red-500"
                                  onClick={() => {
                                    const updated = currentIds.filter((_, i) => i !== slotIdx)
                                    updateCartItem(gi._index, 'employee_ids', updated.length ? updated : [])
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                updateCartItem(gi._index, 'employee_ids', [...currentIds, ''])
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add employee
                            </Button>
                          </div>
                        )
                      })}
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
                <div className="font-medium text-lg flex items-center gap-2">
                  {cartItems[editingItemIndex]?.item_name}
                  {(cartItems[editingItemIndex]?.star_points ?? 0) > 0 && (
                    <span className="inline-flex items-center text-amber-600 text-sm font-normal">
                      <Star className="h-4 w-4 fill-amber-500" />
                      {cartItems[editingItemIndex].star_points} stars
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                      value={
                        cartItems[editingItemIndex]?.discount_amount_override != null
                          ? ''
                          : (cartItems[editingItemIndex]?.discount_percent ?? '')
                      }
                      placeholder={
                        cartItems[editingItemIndex]?.discount_amount_override != null ? '—' : '0'
                      }
                      onChange={(e) => {
                        const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        setCartItems((items) =>
                          items.map((it, i) =>
                            i === editingItemIndex
                              ? { ...it, discount_percent: v, discount_amount_override: undefined }
                              : it
                          )
                        )
                      }}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Discount ₹</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        cartItems[editingItemIndex]?.discount_amount_override != null
                          ? cartItems[editingItemIndex].discount_amount_override
                          : ''
                      }
                      placeholder="0"
                      onChange={(e) => {
                        const v = e.target.value
                        const num = parseFloat(v)
                        setCartItems((items) =>
                          items.map((it, i) =>
                            i === editingItemIndex
                              ? {
                                  ...it,
                                  discount_amount_override:
                                    v === '' || !Number.isFinite(num) ? undefined : Math.max(0, num),
                                  discount_percent:
                                    v === '' || !Number.isFinite(num) ? it.discount_percent : 0,
                                }
                              : it
                          )
                        )
                      }}
                    />
                  </div>
                </div>

                {/* Employee assignment — multiple employees allowed for any item */}
                <div>
                  <Label className="mb-2 block">
                    Assign Employee(s) (optional)
                  </Label>
                  {employees.length === 0 ? (
                    <p className="text-sm text-gray-500 p-1">No employees available</p>
                  ) : (
                    <div className="space-y-2">
                      {((currentIds) => (currentIds.length ? currentIds : ['']))(cartItems[editingItemIndex]?.employee_ids || []).map((eid, slotIdx) => (
                        <div key={slotIdx} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-20 shrink-0">Employee {slotIdx + 1}</span>
                          <select
                            className="flex-1 h-9 px-3 text-sm border rounded-md min-w-0"
                            value={((cartItems[editingItemIndex]?.employee_ids || [])[slotIdx] || '').toString()}
                            onChange={(e) => {
                              const currentIds = cartItems[editingItemIndex]?.employee_ids || []
                              const updated = [...currentIds]
                              while (updated.length <= slotIdx) updated.push('')
                              updated[slotIdx] = e.target.value || ''
                              updateCartItem(editingItemIndex, 'employee_ids', updated)
                            }}
                          >
                            <option value="">— None —</option>
                            {employees.map((emp) => (
                              <option key={emp.employee_id} value={emp.employee_id}>
                                {emp.full_name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const currentIds = cartItems[editingItemIndex]?.employee_ids || []
                              const updated = currentIds.filter((_, i) => i !== slotIdx)
                              updateCartItem(editingItemIndex, 'employee_ids', updated.length ? updated : [])
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const currentIds = cartItems[editingItemIndex]?.employee_ids || []
                          updateCartItem(editingItemIndex, 'employee_ids', [...currentIds, ''])
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add employee
                      </Button>
                    </div>
                  )}
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
