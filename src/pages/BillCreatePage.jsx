import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '@/services/customer.service'
import { serviceService } from '@/services/service.service'
import { productService } from '@/services/product.service'
import { branchService } from '@/services/branch.service'
import { billService } from '@/services/bill.service'
import { chairService } from '@/services/chair.service'
import { upiAccountService } from '@/services/upiAccount.service'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { formatCurrency, fuzzyMatch, fuzzyScore } from '@/lib/utils'
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
  Armchair,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import CustomerModal from '@/components/modals/CustomerModal'
import { UserPlus } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'

const IST = 'Asia/Kolkata'

/** Today's date string YYYY-MM-DD in IST */
function getTodayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST })
}

/** Current time HH:mm in IST */
function getCurrentTimeIST() {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Current date and time formatted for display in IST */
function getCurrentDateTimeIST() {
  const d = new Date()
  return {
    date: d.toLocaleDateString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
  }
}

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
  const { collapsed: sidebarCollapsed, collapse: collapseSidebar, setCollapsed: setSidebarCollapsed } = useSidebar()
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
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false)

  // Branch
  const [selectedBranch, setSelectedBranch] = useState(branchId)

  // Chair (optional)
  const [selectedChair, setSelectedChair] = useState('')
  // Bill book number / No. (optional)
  const [bookNumber, setBookNumber] = useState('')

  // Item selection
  const [selectedCategory, setSelectedCategory] = useState('services')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [itemSearch, setItemSearch] = useState('') // search filter for service/package/product name
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false)
  const itemComboboxRef = useRef(null)
  const [itemPrice, setItemPrice] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [componentEmployees, setComponentEmployees] = useState({}) // { componentIndex: [employeeIds] }
  const [sameEmployeeForAll, setSameEmployeeForAll] = useState(false)
  const [globalEmployee, setGlobalEmployee] = useState('')

  // Cart
  const [cartItems, setCartItems] = useState([])
  const [cartCollapsed, setCartCollapsed] = useState(false)

  // Edit modal
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Checkout
  const [billDiscountPercent, setBillDiscountPercent] = useState(0)
  const [discountReason, setDiscountReason] = useState('')
  const [addDiscountPercent, setAddDiscountPercent] = useState(0)
  const [addDiscountAmount, setAddDiscountAmount] = useState('')
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

  const { data: chairsData } = useQuery({
    queryKey: ['chairs', { branch_id: selectedBranch, status: 'available' }],
    queryFn: () => chairService.getChairs({ branch_id: selectedBranch, status: 'available' }),
    enabled: !!selectedBranch,
  })

  const { data: upiAccountsData } = useQuery({
    queryKey: ['upi-accounts', 'active'],
    queryFn: () => upiAccountService.getAccounts({ is_active: 'true' }),
  })

  const customers = customersData?.data || []
  const services = servicesData?.data || []
  const packages = packagesData?.data || []
  const products = productsData?.data || []
  const branches = branchesData?.data || []
  const employees = employeesData?.data || []
  const availableChairs = chairsData?.data || []
  const upiAccounts = upiAccountsData?.data || []

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

  // Filtered item options (fuzzy search): type "hircut" → matches "Haircut", etc.
  const filteredItemOptions = useMemo(() => {
    const q = (itemSearch || '').trim()
    if (!q) return itemOptions
    const nameKey = 'name'
    return itemOptions
      .filter((o) => fuzzyMatch(o[nameKey] || '', q))
      .sort((a, b) => fuzzyScore(b[nameKey] || '', q) - fuzzyScore(a[nameKey] || '', q))
  }, [itemOptions, itemSearch])

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
    return Math.round((lineTotal * (item.discount_percent || 0)) / 100)
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const itemsDiscount = cartItems.reduce((sum, item) => sum + getItemDiscount(item), 0)
  const billDiscount =
    subtotal > 0 ? Math.round((subtotal - itemsDiscount) * (billDiscountPercent / 100)) : 0
  const totalDiscount = itemsDiscount + billDiscount
  const totalAmount = Math.round(subtotal - totalDiscount)
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const remaining = totalAmount - totalPaid

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: billService.createBill,
    onSuccess: (response) => {
      toast.success('Bill created successfully!')
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['chairs'] })
      const billId = response.data?.bill_id
      if (billId) {
        navigate(`/bills/${billId}`)
      } else {
        navigate('/bills')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create bill')
    },
  })

  // Build prefill for inline customer add modal
  const customerPrefill = useMemo(() => {
    if (!customerSearch || customerSearch.length < 2) return null
    const isPhone = /^\d+$/.test(customerSearch.trim())
    return isPhone
      ? { phone: customerSearch.trim() }
      : { customer_name: customerSearch.trim() }
  }, [customerSearch])

  // Handlers
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.customer_name)
    setShowCustomerDropdown(false)
  }

  const handleItemSelect = (id) => {
    setSelectedItemId(id || null)
    setComponentEmployees({})
    setSameEmployeeForAll(false)
    setGlobalEmployee('')
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

  const handleAddToCart = async () => {
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

      const packagePrice = parseFloat(itemPrice) || (pkg.individual_price || 0)

      if (standaloneServices.length > 0 || hasGroups) {
        // Build selected_services array from standalone + OR-group chosen services
        const selectedServices = []
        let idx = 0

        standaloneServices.forEach((ps) => {
          selectedServices.push({
            service_id: ps.service_id,
            service_name: ps.service_name,
            original_service_price: ps.service_price,
            employee_ids: (componentEmployees[idx] || []).filter(Boolean),
            star_points: getPackageServiceStarPoints(ps),
            is_multi_employee: ps.is_multi_employee ?? false,
            employee_count: ps.employee_count ?? null,
            quantity: ps.quantity,
            item_status: 'completed',
          })
          idx += 1
        })

        serviceGroups.forEach((g, gi) => {
          const selectedId = (packageGroupSelections[pkg.id] || [])[gi]
          const chosen = (g.services || []).find((s) => s.service_id === selectedId)
          if (chosen) {
            selectedServices.push({
              service_id: chosen.service_id,
              service_name: chosen.service_name,
              original_service_price: chosen.service_price,
              employee_ids: (componentEmployees[idx] || []).filter(Boolean),
              star_points: getPackageServiceStarPoints(chosen),
              is_multi_employee: chosen.is_multi_employee ?? false,
              employee_count: chosen.employee_count ?? null,
              quantity: chosen.quantity,
              item_status: 'completed',
            })
            idx += 1
          }
        })

        // Fetch distributed prices from backend
        try {
          const previewRes = await serviceService.previewPackageDistribution({
            package_id: pkg.id,
            package_price: packagePrice,
            selected_services: selectedServices.map((s) => ({ service_id: s.service_id })),
          })
          const distributed = previewRes.data?.services || previewRes.data?.data?.services || []
          distributed.forEach((ds) => {
            const match = selectedServices.find((s) => s.service_id === ds.service_id)
            if (match) match.distributed_price = ds.distributed_price
          })
        } catch (err) {
          // Preview failed — continue without distributed prices
          console.warn('Package distribution preview failed:', err)
        }

        const totalStarPoints = selectedServices.reduce((sum, s) => sum + (s.star_points || 0), 0)

        setCartItems([
          ...cartItems,
          {
            cart_id: crypto.randomUUID(),
            item_type: 'package',
            package_id: pkg.id,
            item_name: pkg.name,
            unit_price: packagePrice,
            quantity: 1,
            employee_ids: [],
            employee_id: null,
            discount_percent: parseFloat(addDiscountAmount) > 0 ? 0 : addDiscountPercent,
            discount_amount_override: parseFloat(addDiscountAmount) > 0 ? parseFloat(addDiscountAmount) : undefined,
            star_points: totalStarPoints,
            source_package_name: pkg.name,
            source_individual_price: pkg.individual_price || 0,
            selected_services: selectedServices,
            item_status: 'completed',
          },
        ])
      } else {
        // Flat package — single cart item with selected_services: []
        setCartItems([
          ...cartItems,
          {
            cart_id: crypto.randomUUID(),
            item_type: 'package',
            package_id: pkg.id,
            item_name: pkg.name,
            unit_price: packagePrice,
            quantity: 1,
            employee_ids: (componentEmployees[0] || []).filter(Boolean),
            employee_id: null,
            discount_percent: parseFloat(addDiscountAmount) > 0 ? 0 : addDiscountPercent,
            discount_amount_override: parseFloat(addDiscountAmount) > 0 ? parseFloat(addDiscountAmount) : undefined,
            source_package_name: pkg.name,
            source_individual_price: pkg.individual_price || 0,
            selected_services: [],
            item_status: 'completed',
          },
        ])
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
    setComponentEmployees({})
    setSameEmployeeForAll(false)
    setGlobalEmployee('')
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

  // Set entire package + all its services to pending/completed
  const setPackagePending = (cartIndex, pending) => {
    const nextStatus = pending ? 'pending' : 'completed'
    setCartItems((items) =>
      items.map((item, i) =>
        i === cartIndex
          ? {
              ...item,
              item_status: nextStatus,
              selected_services: (item.selected_services || []).map((svc) => ({
                ...svc, item_status: nextStatus,
              })),
            }
          : item
      )
    )
  }

  // Toggle one service's status within a package
  const togglePackageServicePending = (cartIndex, serviceIdx) => {
    setCartItems((items) =>
      items.map((item, i) => {
        if (i !== cartIndex) return item
        const updated = item.selected_services.map((svc, si) =>
          si === serviceIdx
            ? { ...svc, item_status: svc.item_status === 'pending' ? 'completed' : 'pending' }
            : svc
        )
        const allPending = updated.every((s) => s.item_status === 'pending')
        const allDone = updated.every((s) => s.item_status === 'completed')
        return {
          ...item,
          selected_services: updated,
          item_status: allPending ? 'pending' : allDone ? 'completed' : item.item_status,
        }
      })
    )
  }

  // Update employee_ids for one service within a package
  const updatePackageServiceEmployees = (cartIndex, serviceIdx, newEmployeeIds) => {
    setCartItems((items) =>
      items.map((item, i) =>
        i !== cartIndex ? item : {
          ...item,
          selected_services: item.selected_services.map((svc, si) =>
            si === serviceIdx ? { ...svc, employee_ids: newEmployeeIds } : svc
          ),
        }
      )
    )
  }

  const handleRemoveItem = (index) => {
    setCartItems((items) => items.filter((_, i) => i !== index))
  }

  // Group cart items: packages as single items, standalone items separate
  const groupedCart = useMemo(() => {
    const groups = []
    cartItems.forEach((item, index) => {
      if (item.item_type === 'package' && item.selected_services) {
        const lineTotal = item.unit_price * item.quantity
        const lineDiscount = getItemDiscount(item)
        const total = lineTotal - lineDiscount
        const individualPrice = item.source_individual_price
        const savings = individualPrice != null && individualPrice > total ? individualPrice - total : 0
        groups.push({
          type: 'package',
          index,
          item,
          total,
          subtotal: lineTotal,
          discount: lineDiscount,
          individual_price: individualPrice,
          savings,
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

  // Barcode scan handler
  const handleBarcodeScan = async (barcode) => {
    try {
      const res = await productService.getByBarcode(barcode)
      const product = res?.data || res
      if (!product?.product_id) {
        toast.error('Product not found for barcode')
        return
      }
      setCartItems([
        ...cartItems,
        {
          cart_id: crypto.randomUUID(),
          item_type: 'product',
          product_id: product.product_id,
          item_name: product.name || product.product_name || '',
          unit_price: parseFloat(product.selling_price || product.price || 0),
          quantity: 1,
          employee_ids: [],
          employee_id: null,
          discount_percent: 0,
          item_status: 'completed',
        },
      ])
      toast.success(`Added: ${product.name || product.product_name}`)
    } catch {
      toast.error('Product not found for this barcode')
    }
  }

  // Convert cart items into the API format at submit time
  const buildSubmitItems = (items) => {
    return items.map((item) => {
      if (item.item_type === 'package') {
        const lineTotal = item.unit_price * item.quantity
        const discount = getItemDiscount(item)
        const selectedServices = (item.selected_services || []).map((svc) => {
          const empIds = (svc.employee_ids || []).filter(Boolean)
          return {
            service_id: svc.service_id,
            ...(empIds.length > 1
              ? { employee_ids: empIds }
              : empIds.length === 1
                ? { employee_id: empIds[0] }
                : {}),
            status: svc.item_status === 'pending' ? 'pending' : 'completed',
          }
        })
        return {
          item_type: 'package',
          package_id: item.package_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: parseFloat(discount.toFixed(2)),
          discount_percentage:
            lineTotal > 0 ? parseFloat(((discount / lineTotal) * 100).toFixed(2)) : 0,
          selected_services: selectedServices,
          notes: item.source_package_name || null,
          status: item.item_status === 'pending' ? 'pending' : 'completed',
        }
      }

      // Non-package items
      return {
        item_type: item.item_type,
        service_id: item.service_id || null,
        package_id: item.package_id || null,
        product_id: item.product_id || null,
        employee_id: null,
        employee_ids: (item.employee_ids || []).filter(Boolean).length > 0
          ? (item.employee_ids || []).filter(Boolean)
          : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: parseFloat(getItemDiscount(item).toFixed(2)),
        discount_percentage:
          item.unit_price * item.quantity > 0
            ? parseFloat(
                ((getItemDiscount(item) / (item.unit_price * item.quantity)) * 100).toFixed(2)
              )
            : 0,
        notes: item.source_package_name || null,
        status: item.item_status === 'pending' ? 'pending' : 'completed',
      }
    })
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
      billDateTime = `${billDate}T${time}:00.000Z`
    }

    const billData = {
      customer_id: selectedCustomer.customer_id,
      branch_id: selectedBranch,
      bill_type: billType,
      bill_date: billDateTime,
      chair_id: selectedChair || undefined,
      book_number: bookNumber.trim() || undefined,
      items: buildSubmitItems(cartItems),
      payments: validPayments.map((p) => ({
        payment_mode: p.payment_mode,
        amount: parseFloat(p.amount),
        ...(p.upi_account_id ? { upi_account_id: p.upi_account_id } : {}),
      })),
      discount_amount: parseFloat(billDiscount.toFixed(2)),
      discount_reason: discountReason,
      notes,
    }

    createBillMutation.mutate(billData)
  }

  // Start service — creates a pending bill without payments
  const handleStartService = () => {
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
    if (billType === 'previous' && !billDate) {
      toast.error('Please select a date for the previous bill')
      return
    }

    let billDateTime = null
    if (billType === 'previous') {
      const time = billTime || '12:00'
      billDateTime = `${billDate}T${time}:00.000Z`
    }

    const billData = {
      customer_id: selectedCustomer.customer_id,
      branch_id: selectedBranch,
      bill_type: billType,
      bill_date: billDateTime,
      chair_id: selectedChair || undefined,
      book_number: bookNumber.trim() || undefined,
      items: buildSubmitItems(cartItems),
      payments: [],
      discount_amount: parseFloat(billDiscount.toFixed(2)),
      discount_reason: discountReason,
      notes,
      status: 'pending',
    }

    createBillMutation.mutate(billData)
  }

  // Set default branch for non-owner users
  useEffect(() => {
    if (branchId && !selectedBranch) {
      setSelectedBranch(branchId)
    }
  }, [branchId, selectedBranch])

  // Default date/time to today and current time in IST when switching to Previous Bill
  useEffect(() => {
    if (billType === 'previous' && !billDate) {
      setBillDate(getTodayIST())
      setBillTime(getCurrentTimeIST())
    }
  }, [billType, billDate])

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

  // Close item combobox dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (itemComboboxRef.current && !itemComboboxRef.current.contains(e.target)) {
        setItemDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-set payment amount when total changes (single payment)
  useEffect(() => {
    if (payments.length === 1 && totalAmount >= 0) {
      setPayments([{ ...payments[0], amount: totalAmount > 0 ? totalAmount.toFixed(2) : '' }])
    }
  }, [totalAmount])

  // Auto-collapse sidebar on mount, restore on unmount
  useEffect(() => {
    const wasCollapsed = sidebarCollapsed
    collapseSidebar()
    return () => {
      if (!wasCollapsed) setSidebarCollapsed(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Today in IST for max date on picker and defaults
  const todayStr = getTodayIST()

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-0">
      {/* Compact Top Strip - Back, Bill Type, Customer, Branch, Chair, Book No, Date */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3">
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigate('/bills')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <Tabs
          value={billType}
          onValueChange={(v) => setBillType(v)}
          className="h-8"
        >
          <TabsList className="h-8">
            <TabsTrigger value="current" className="h-7 text-xs px-3">Current</TabsTrigger>
            <TabsTrigger value="previous" className="h-7 text-xs px-3">Previous</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1 min-w-[200px] max-w-[320px] relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Customer name, phone or ID..."
              className="h-8 pl-8 pr-8 text-sm"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setShowCustomerDropdown(true)
                if (!e.target.value) setSelectedCustomer(null)
              }}
              onFocus={() => setShowCustomerDropdown(true)}
            />
            {selectedCustomer && (
              <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
            )}
          </div>
          {showCustomerDropdown && customerSearch.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
              {customersLoading ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />
                  Searching...
                </div>
              ) : customers.length === 0 ? (
                <div className="p-3 text-center">
                  <p className="text-gray-500 text-xs mb-2">No customers found</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowCustomerDropdown(false)
                      setAddCustomerModalOpen(true)
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Add New
                  </Button>
                </div>
              ) : (
                customers.map((customer) => (
                  <div
                    key={customer.customer_id}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="font-medium text-sm">
                      {customer.customer_code && <span className="text-gray-400 font-mono text-xs mr-1">#{customer.customer_code}</span>}
                      {customer.customer_name}
                    </div>
                    <div className="text-xs text-gray-500">{customer.phone_masked}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {!branchId && (
          <select
            className="h-8 px-2 text-sm border rounded-md w-36"
            value={selectedBranch || ''}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">Branch...</option>
            {branches.map((branch) => (
              <option key={branch.branch_id} value={branch.branch_id}>
                {branch.name}
              </option>
            ))}
          </select>
        )}

        {selectedBranch && (
          <select
            className="h-8 px-2 text-sm border rounded-md w-40"
            value={selectedChair}
            onChange={(e) => setSelectedChair(e.target.value)}
            title="Chair (optional)"
          >
            <option value="">Chair...</option>
            {availableChairs.map((chair) => (
              <option key={chair.chair_id} value={chair.chair_id}>
                {chair.chair_number}{chair.chair_name ? ` - ${chair.chair_name}` : ''}
              </option>
            ))}
          </select>
        )}

        <Input
          type="text"
          placeholder="Book No."
          className="h-8 w-24 text-sm"
          value={bookNumber}
          onChange={(e) => setBookNumber(e.target.value)}
          maxLength={50}
        />

        {billType === 'previous' ? (
          <>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              max={todayStr}
            />
            <Input
              type="time"
              className="h-8 w-28 text-sm"
              value={billTime}
              onChange={(e) => setBillTime(e.target.value)}
            />
          </>
        ) : (
          <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 border rounded-md">
            {getCurrentDateTimeIST().date}, {getCurrentDateTimeIST().time}
          </span>
        )}
      </div>

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
                  setItemSearch('')
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
              {/* Barcode Scan Input — products only */}
              {selectedCategory === 'products' && (
                <div>
                  <Input
                    placeholder="Scan barcode..."
                    className="font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleBarcodeScan(e.target.value.trim())
                        e.target.value = ''
                      }
                    }}
                  />
                </div>
              )}
              {/* Item Combobox: type to search, dropdown shows results — click to select */}
              <div ref={itemComboboxRef} className="space-y-2">
                <Label className="mb-2 block">
                  Select{' '}
                  {selectedCategory === 'services'
                    ? 'Service'
                    : selectedCategory === 'packages'
                      ? 'Package'
                      : 'Product'}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder={
                      selectedCategory === 'services'
                        ? 'Type to search service...'
                        : selectedCategory === 'packages'
                          ? 'Type to search package...'
                          : 'Type to search product...'
                    }
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value)
                      setItemDropdownOpen(true)
                    }}
                    onFocus={() => setItemDropdownOpen(true)}
                    className="pl-9 h-10"
                  />
                  {/* Dropdown list: appears below input when open */}
                  {itemDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg z-50">
                      {filteredItemOptions.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          No matching {selectedCategory === 'services' ? 'service' : selectedCategory === 'packages' ? 'package' : 'product'} found.
                        </div>
                      ) : (
                        <ul className="p-1">
                          {filteredItemOptions.map((opt) => (
                            <li key={opt.id}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                                onClick={() => {
                                  handleItemSelect(opt.id)
                                  setItemSearch('')
                                  setItemDropdownOpen(false)
                                }}
                              >
                                {opt.description ? `[${opt.description}] ` : ''}{opt.name} — {formatCurrency(opt.price)}
                                {selectedCategory === 'services' && opt.star_points != null && opt.star_points > 0 ? ` (⭐ ${opt.star_points})` : ''}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
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


                  {/* Same employee for all services (packages only) */}
                  {selectedCategory === 'packages' && (selectedItem.services?.length > 0 || selectedItem.service_groups?.length > 0) && (
                    <div className="flex items-center gap-3 p-2 bg-blue-50 rounded border border-blue-200">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={sameEmployeeForAll}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setSameEmployeeForAll(checked)
                            if (!checked) {
                              setGlobalEmployee('')
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-blue-700 font-medium">Same employee for all services</span>
                      </label>
                      {sameEmployeeForAll && (
                        <SearchableSelect
                          className="flex-1 min-w-[150px]"
                          options={employees.map((emp) => ({ value: emp.employee_id, label: emp.full_name }))}
                          value={globalEmployee}
                          onChange={(val) => {
                            setGlobalEmployee(val)
                            if (val) {
                              // Apply to all component indices
                              const totalComponents = (selectedItem.services?.length || 0) + (selectedItem.service_groups?.length || 0)
                              const updated = {}
                              for (let i = 0; i < totalComponents; i++) {
                                updated[i] = [val]
                              }
                              setComponentEmployees(updated)
                            }
                          }}
                          placeholder="Select employee..."
                        />
                      )}
                    </div>
                  )}

                  {/* Package services — inline single-row: name, stars, qty, price, employee dropdowns */}
                  {selectedCategory === 'packages' && selectedItem.services?.length > 0 && (
                    <div className="text-sm space-y-1">
                      {selectedItem.services.map((ps, idx) => {
                        const slots = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                        return (
                          <div key={ps.service_id} className="flex items-center gap-2 p-1.5 bg-white rounded border flex-wrap">
                            <span className="text-gray-700 text-xs font-medium truncate max-w-[140px]" title={ps.service_name}>
                              {ps.service_name}
                            </span>
                            {getPackageServiceStarPoints(ps) > 0 && (
                              <span className="inline-flex items-center text-amber-600 text-[10px] shrink-0">
                                <Star className="h-2.5 w-2.5 fill-amber-500" />
                                {getPackageServiceStarPoints(ps)}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 shrink-0">x{ps.quantity} {formatCurrency(ps.service_price)}</span>
                            <div className="flex items-center gap-1 ml-auto flex-wrap">
                              {slots.map((_, slotIdx) => (
                                <div key={slotIdx} className="flex items-center gap-0.5">
                                  <SearchableSelect
                                    compact
                                    className="min-w-[100px]"
                                    options={employees.filter((emp) => {
                                      const others = (componentEmployees[idx] || []).filter((id, i) => i !== slotIdx && id).map(String)
                                      return !others.includes(String(emp.employee_id))
                                    }).map((emp) => ({ value: emp.employee_id, label: emp.full_name }))}
                                    value={(componentEmployees[idx] || [])[slotIdx] || ''}
                                    onChange={(val) => {
                                      const current = [...(componentEmployees[idx] || [])]
                                      while (current.length <= slotIdx) current.push('')
                                      current[slotIdx] = val || ''
                                      setComponentEmployees((prev) => ({ ...prev, [idx]: current }))
                                    }}
                                    placeholder="Staff..."
                                    disabled={sameEmployeeForAll}
                                  />
                                  {slots.length > 1 && (
                                    <button
                                      type="button"
                                      className="h-5 w-5 flex items-center justify-center rounded text-red-400 hover:text-red-600 shrink-0"
                                      title="Remove employee"
                                      onClick={() => {
                                        const current = (componentEmployees[idx] || []).filter((_, i) => i !== slotIdx)
                                        setComponentEmployees((prev) => ({ ...prev, [idx]: current.length ? current : [''] }))
                                      }}
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                className="h-6 w-6 flex items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 shrink-0"
                                title="Add employee"
                                onClick={() => {
                                  const current = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                                  setComponentEmployees((prev) => ({ ...prev, [idx]: [...current, ''] }))
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* OR groups — inline: service selector + employee dropdowns on same row */}
                  {selectedCategory === 'packages' &&
                    selectedItem.service_groups?.length > 0 &&
                    (() => {
                      const standaloneLen = (selectedItem.services || []).length
                      return (
                        <div className="text-sm space-y-1.5">
                          {selectedItem.service_groups.map((group, groupIdx) => {
                            const selectedId = (packageGroupSelections[selectedItemId] || [])[groupIdx]
                            const chosen = (group.services || []).find((s) => s.service_id === selectedId)
                            const groupServices = group.services || []
                            const idx = standaloneLen + groupIdx
                            const slots = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                            return (
                              <div key={group.group_id || groupIdx} className="p-1.5 bg-amber-50/50 rounded border border-amber-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-medium text-amber-700 shrink-0">{group.group_label || `OR ${groupIdx + 1}`}</span>
                                  <select
                                    className="h-6 px-1 text-[11px] border rounded min-w-[120px] flex-1 border-amber-300"
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
                                    <option value="">Select...</option>
                                    {groupServices.map((s) => {
                                      const bonusNames = (s.bonus_services || []).map(b => b.service_name).join(', ')
                                      return (
                                        <option key={s.service_id} value={s.service_id}>
                                          {s.service_name} {formatCurrency(s.service_price)}{getPackageServiceStarPoints(s) > 0 ? ` (${getPackageServiceStarPoints(s)}pts)` : ''}{bonusNames ? ` +Free: ${bonusNames}` : ''}
                                        </option>
                                      )
                                    })}
                                  </select>
                                  {chosen && (
                                    <>
                                      {slots.map((_, slotIdx) => (
                                        <div key={slotIdx} className="flex items-center gap-0.5">
                                          <SearchableSelect
                                            compact
                                            className="min-w-[100px]"
                                            options={employees.filter((emp) => {
                                              const others = (componentEmployees[idx] || []).filter((id, i) => i !== slotIdx && id).map(String)
                                              return !others.includes(String(emp.employee_id))
                                            }).map((emp) => ({ value: emp.employee_id, label: emp.full_name }))}
                                            value={(componentEmployees[idx] || [])[slotIdx] || ''}
                                            onChange={(val) => {
                                              const current = [...(componentEmployees[idx] || [])]
                                              while (current.length <= slotIdx) current.push('')
                                              current[slotIdx] = val || ''
                                              setComponentEmployees((prev) => ({ ...prev, [idx]: current }))
                                            }}
                                            placeholder="Staff..."
                                            disabled={sameEmployeeForAll}
                                          />
                                          {slots.length > 1 && (
                                            <button
                                              type="button"
                                              className="h-5 w-5 flex items-center justify-center rounded text-red-400 hover:text-red-600 shrink-0"
                                              title="Remove employee"
                                              onClick={() => {
                                                const current = (componentEmployees[idx] || []).filter((_, i) => i !== slotIdx)
                                                setComponentEmployees((prev) => ({ ...prev, [idx]: current.length ? current : [''] }))
                                              }}
                                            >
                                              <Trash2 className="h-2.5 w-2.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        className="h-6 w-6 flex items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 shrink-0"
                                        title="Add employee"
                                        onClick={() => {
                                          const current = (componentEmployees[idx] || []).length ? (componentEmployees[idx] || []) : ['']
                                          setComponentEmployees((prev) => ({ ...prev, [idx]: [...current, ''] }))
                                        }}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                {chosen?.bonus_services?.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    <span className="text-[10px] text-green-600 font-medium">Free:</span>
                                    {chosen.bonus_services.map((bs) => (
                                      <span key={bs.service_id} className="text-[10px] bg-green-50 text-green-700 px-1 py-0.5 rounded border border-green-200">
                                        {bs.service_name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}

                  {/* Flat package — inline employee assignment */}
                  {selectedCategory === 'packages' &&
                    (!selectedItem.services || selectedItem.services.length === 0) &&
                    !(selectedItem.service_groups?.length > 0) && (
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-xs text-gray-500 shrink-0">Staff:</span>
                        {((componentEmployees[0] || []).length ? componentEmployees[0] : ['']).map((_, slotIdx) => {
                          const allSlots = (componentEmployees[0] || []).length ? componentEmployees[0] : ['']
                          return (
                            <div key={slotIdx} className="flex items-center gap-0.5">
                              <select
                                className="h-7 px-1 text-xs border rounded min-w-[90px]"
                                value={(componentEmployees[0] || [])[slotIdx] || ''}
                                onChange={(e) => {
                                  const current = [...(componentEmployees[0] || [])]
                                  while (current.length <= slotIdx) current.push('')
                                  current[slotIdx] = e.target.value || ''
                                  setComponentEmployees((prev) => ({ ...prev, [0]: current }))
                                }}
                              >
                                <option value="">Staff...</option>
                                {employees.filter((emp) => {
                                  const others = (componentEmployees[0] || []).filter((id, i) => i !== slotIdx && id).map(String)
                                  return !others.includes(String(emp.employee_id))
                                }).map((emp) => (
                                  <option key={emp.employee_id} value={emp.employee_id}>
                                    {emp.full_name}
                                  </option>
                                ))}
                              </select>
                              {allSlots.length > 1 && (
                                <button
                                  type="button"
                                  className="h-5 w-5 flex items-center justify-center rounded text-red-400 hover:text-red-600 shrink-0"
                                  title="Remove employee"
                                  onClick={() => {
                                    const current = (componentEmployees[0] || []).filter((_, i) => i !== slotIdx)
                                    setComponentEmployees((prev) => ({ ...prev, [0]: current.length ? current : [''] }))
                                  }}
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                        <button
                          type="button"
                          className="h-7 w-7 flex items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 shrink-0"
                          title="Add employee"
                          onClick={() => {
                            const current = (componentEmployees[0] || []).length ? (componentEmployees[0] || []) : ['']
                            setComponentEmployees((prev) => ({ ...prev, [0]: [...current, ''] }))
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}

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
                            <SearchableSelect
                              className="flex-1 min-w-0"
                              options={employees.filter((emp) => {
                                const others = (componentEmployees[0] || []).filter((id, i) => i !== slotIdx && id).map(String)
                                return !others.includes(String(emp.employee_id))
                              }).map((emp) => ({ value: emp.employee_id, label: emp.full_name }))}
                              value={((componentEmployees[0] || [])[slotIdx] || '').toString()}
                              onChange={(val) => {
                                const current = [...(componentEmployees[0] || [])]
                                while (current.length <= slotIdx) current.push('')
                                current[slotIdx] = val || ''
                                setComponentEmployees({ 0: current })
                              }}
                              placeholder="-- None --"
                            />
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

        {/* Right Panel - Cart + Checkout (collapsible) */}
        <div
          className={`flex flex-col flex-shrink-0 transition-[width] duration-200 ease-in-out ${
            cartCollapsed ? 'w-14' : 'w-[480px]'
          }`}
        >
          <Card className="flex-1 overflow-hidden flex flex-col">
            {/* Sticky Cart Header */}
            <CardHeader className="pb-0 flex flex-row items-center gap-0 p-0 min-h-0 flex-shrink-0 border-b">
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
                  {totalAmount > 0 && (
                    <span className="text-xs font-bold text-primary [writing-mode:vertical-lr] rotate-180">
                      {formatCurrency(totalAmount)}
                    </span>
                  )}
                </div>
              ) : (
                <CardTitle className="flex items-center justify-between flex-1 py-2.5 px-4">
                  <span className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="h-4 w-4" />
                    Cart
                    <Badge variant="secondary" className="text-xs">{cartItems.length}</Badge>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCartCollapsed(true)}
                    className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                    title="Collapse cart"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </button>
                </CardTitle>
              )}
            </CardHeader>

            {!cartCollapsed && (
            <>
            {/* Scrollable Cart + Checkout Content */}
            <CardContent className="flex-1 overflow-auto p-3 space-y-3">
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No items in cart</p>
                  <p className="text-xs">Select items from the left panel</p>
                </div>
              ) : (
                <>
                {/* Cart Items */}
                <div className="space-y-2">
                  {groupedCart.map((group) => {
                    if (group.type === 'package') {
                      const pkgItem = group.item
                      const lineDiscount = getItemDiscount(pkgItem)
                      return (
                        <div
                          key={pkgItem.cart_id}
                          className="bg-gray-50 rounded-lg border overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 p-2.5 bg-gray-100">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <Package className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm truncate">
                                {pkgItem.item_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {pkgItem.item_status === 'pending' || (pkgItem.selected_services || []).every((s) => s.item_status === 'pending') ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-1.5"
                                  onClick={() => setPackagePending(group.index, false)}
                                >
                                  Mark done
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-1.5 text-amber-700 border-amber-300"
                                  onClick={() => setPackagePending(group.index, true)}
                                >
                                  Mark pending
                                </Button>
                              )}
                              {group.savings > 0 && (
                                <span className="text-[10px] text-green-600 font-medium">
                                  Save {formatCurrency(group.savings)}
                                </span>
                              )}
                              <span className="font-bold text-sm">
                                {formatCurrency(group.total)}
                              </span>
                              <button
                                className="p-0.5 hover:bg-gray-200 rounded"
                                onClick={() => {
                                  setEditingItemIndex(group.index)
                                  setEditModalOpen(true)
                                }}
                              >
                                <Pencil className="h-3 w-3 text-gray-500" />
                              </button>
                              <button
                                className="p-0.5 hover:bg-red-100 rounded"
                                onClick={() => handleRemoveItem(group.index)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                          {/* Package-level discount */}
                          <div className="px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 border-b">
                            <span className="text-[10px] text-gray-500">Disc:</span>
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] text-gray-400">%</span>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                className="h-5 w-10 text-[10px] px-1"
                                value={pkgItem.discount_amount_override != null ? '' : (pkgItem.discount_percent ?? '')}
                                placeholder={pkgItem.discount_amount_override != null ? '—' : '0'}
                                onChange={(e) => {
                                  const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                  setCartItems((items) =>
                                    items.map((it, i) =>
                                      i === group.index
                                        ? { ...it, discount_percent: v, discount_amount_override: undefined }
                                        : it
                                    )
                                  )
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] text-gray-400">₹</span>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                className="h-5 w-10 text-[10px] px-1"
                                value={pkgItem.discount_amount_override != null ? pkgItem.discount_amount_override : ''}
                                placeholder="0"
                                onChange={(e) => {
                                  const v = e.target.value
                                  const num = parseFloat(v)
                                  setCartItems((items) =>
                                    items.map((it, i) =>
                                      i === group.index
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
                            {lineDiscount > 0 && (
                              <span className="text-[10px] text-red-500">(-{formatCurrency(lineDiscount)})</span>
                            )}
                          </div>
                          {(pkgItem.selected_services || []).length > 0 && (
                            <div className="px-2 py-1.5">
                              <div className="grid grid-cols-2 gap-1.5">
                                {pkgItem.selected_services.map((svc, svcIdx) => (
                                  <div
                                    key={svcIdx}
                                    className="p-1.5 bg-white rounded border text-[11px]"
                                  >
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="font-medium text-gray-700 truncate" title={svc.service_name}>
                                        {svc.service_name}
                                      </span>
                                      {(svc.star_points || 0) > 0 && (
                                        <span className="inline-flex items-center text-amber-600 font-normal shrink-0">
                                          <Star className="h-2.5 w-2.5 fill-amber-500" />
                                          {svc.star_points}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => togglePackageServicePending(group.index, svcIdx)}
                                        className={`shrink-0 text-[10px] px-1 py-0.5 rounded border font-medium ml-auto ${
                                          svc.item_status === 'pending'
                                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50'
                                        }`}
                                      >
                                        {svc.item_status === 'pending' ? 'Pend' : 'Done'}
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                      <span className="text-gray-500 text-[10px]">
                                        {formatCurrency(svc.distributed_price ?? svc.original_service_price)}
                                        {svc.distributed_price != null && svc.distributed_price !== svc.original_service_price && (
                                          <span className="line-through text-gray-300 ml-0.5">{formatCurrency(svc.original_service_price)}</span>
                                        )}
                                      </span>
                                      {svc.employee_ids?.length > 0 &&
                                        svc.employee_ids.map((eid) => {
                                          const emp = employees.find((e) => e.employee_id === eid)
                                          return (
                                            <Badge key={eid} className="text-[9px] px-1 py-0 h-3.5 bg-primary text-white">
                                              {emp?.full_name || '?'}
                                            </Badge>
                                          )
                                        })
                                      }
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Single item
                    const { item, index } = group
                    const lineTotal = item.unit_price * item.quantity
                    const lineDiscount = getItemDiscount(item)
                    const lineNet = lineTotal - lineDiscount
                    return (
                      <div
                        key={item.cart_id}
                        className="p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
                            <span className="font-medium text-sm truncate">{item.item_name}</span>
                            {(item.star_points ?? 0) > 0 && (
                              <span className="inline-flex items-center text-amber-600 text-[10px] shrink-0">
                                <Star className="h-2.5 w-2.5 fill-amber-500" />
                                {item.star_points}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleItemPending(index)}
                              className={`shrink-0 text-[10px] px-1 py-0.5 rounded border ${
                                item.item_status === 'pending'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-amber-50'
                              }`}
                            >
                              {item.item_status === 'pending' ? 'Pending' : 'Done'}
                            </button>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              className="p-0.5 hover:bg-gray-200 rounded"
                              onClick={() => {
                                setEditingItemIndex(index)
                                setEditModalOpen(true)
                              }}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </button>
                            <button
                              type="button"
                              className="p-0.5 hover:bg-red-100 rounded"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mt-1">
                          <span className="text-gray-500">
                            {formatCurrency(item.unit_price)} x {item.quantity}
                          </span>
                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-gray-400 text-[10px]">%</span>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              className="h-5 w-10 text-[10px] px-1"
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
                            <span className="text-gray-400 text-[10px]">₹</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              className="h-5 w-10 text-[10px] px-1"
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
                          <span className="font-semibold ml-auto">
                            {formatCurrency(lineNet)}
                            {lineDiscount > 0 && (
                              <span className="text-[10px] text-red-500 font-normal ml-0.5">
                                (-{formatCurrency(lineDiscount)})
                              </span>
                            )}
                          </span>
                        </div>
                        {item.employee_ids?.length > 0 && (
                          <div className="flex gap-0.5 flex-wrap mt-1">
                            {item.employee_ids.map((eid) => {
                              const emp = employees.find((e) => e.employee_id === eid)
                              return (
                                <Badge key={eid} className="text-[10px] px-1 py-0 h-4 bg-primary text-white">
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

                {/* Summary */}
                <div className="border-t pt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {itemsDiscount > 0 && (
                    <div className="flex justify-between text-red-500 text-xs">
                      <span>Item Discounts</span>
                      <span>-{formatCurrency(itemsDiscount)}</span>
                    </div>
                  )}
                  {billDiscount > 0 && (
                    <div className="flex justify-between text-red-500 text-xs">
                      <span>Bill Discount ({billDiscountPercent}%)</span>
                      <span>-{formatCurrency(billDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {/* Bill Discount */}
                <div className="border-t pt-2">
                  <Label className="text-xs font-medium flex items-center gap-1 mb-1">
                    <Percent className="h-3 w-3" /> Bill Discount
                  </Label>
                  <div className="flex gap-1.5">
                    <div className="w-16 relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="%"
                        className="h-8 text-sm pr-5"
                        value={billDiscountPercent || ''}
                        onChange={(e) =>
                          setBillDiscountPercent(
                            Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                          )
                        }
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                        %
                      </span>
                    </div>
                    <Input
                      placeholder="Reason"
                      className="h-8 text-sm flex-1"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                    />
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t pt-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Split className="h-3 w-3" /> Payment
                      {payments.length > 1 && ` (${payments.length})`}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddPayment}
                      className="h-5 text-[10px] px-1.5 ml-auto"
                    >
                      <Plus className="h-2.5 w-2.5 mr-0.5" /> Split
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {payments.map((payment, index) => (
                      <div key={index} className="space-y-1.5">
                        <div className="flex gap-1">
                          {PAYMENT_MODES.map((mode) => (
                            <button
                              key={mode.value}
                              type="button"
                              onClick={() =>
                                handlePaymentChange(index, 'payment_mode', mode.value)
                              }
                              className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors ${
                                payment.payment_mode === mode.value
                                  ? 'border-primary bg-primary/5 text-primary font-medium'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <mode.icon className="h-3.5 w-3.5" />
                              {mode.label}
                            </button>
                          ))}
                        </div>
                        {payment.payment_mode === 'upi' && upiAccounts.length > 0 && (
                          <Select
                            value={payment.upi_account_id || ''}
                            onValueChange={(val) => handlePaymentChange(index, 'upi_account_id', val)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select UPI Account" />
                            </SelectTrigger>
                            <SelectContent>
                              {upiAccounts.map((acc) => (
                                <SelectItem key={acc.account_id} value={acc.account_id}>{acc.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <div className="flex gap-1.5 items-center">
                          <div className="flex-1 relative">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Amount"
                              className="h-8 text-sm pr-10"
                              value={payment.amount}
                              onChange={(e) =>
                                handlePaymentChange(index, 'amount', e.target.value)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => handleSetFullAmount(index)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-primary hover:underline font-medium"
                            >
                              Full
                            </button>
                          </div>
                          {payments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePayment(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {payments.length > 1 && (
                    <div className="text-[10px] flex gap-3 mt-1">
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

                {/* Notes */}
                <div className="border-t pt-2">
                  <Label className="text-xs font-medium mb-1 block">Notes</Label>
                  <Input
                    placeholder="Add notes..."
                    className="h-8 text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                </>
              )}
            </CardContent>

            {/* Sticky Footer - Submit Buttons */}
            {cartItems.length > 0 && (
            <div className="flex-shrink-0 border-t p-3 space-y-1.5 bg-white">
              <Button
                className="w-full h-10 text-sm"
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
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Complete Bill - {formatCurrency(totalAmount)}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full h-8 text-xs border-primary text-primary hover:bg-primary/5"
                onClick={handleStartService}
                disabled={
                  createBillMutation.isPending ||
                  !selectedCustomer ||
                  cartItems.length === 0
                }
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Start Service (Save as Pending)
              </Button>
            </div>
            )}
            </>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Cart Item Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {/* Package Edit */}
          {editingItemIndex !== null && cartItems[editingItemIndex]?.item_type === 'package' && (() => {
            const pkgItem = cartItems[editingItemIndex]
            const pkgTotal = pkgItem.unit_price * pkgItem.quantity
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" /> Edit Package
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-lg">{pkgItem.item_name}</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(pkgTotal)}</span>
                  </div>

                  {/* Package-level discount */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-gray-500">Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="h-8 w-16 text-xs"
                        value={pkgItem.discount_amount_override != null ? '' : (pkgItem.discount_percent ?? '')}
                        placeholder={pkgItem.discount_amount_override != null ? '—' : '0'}
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
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-gray-500">Discount ₹</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="h-8 w-16 text-xs"
                        value={pkgItem.discount_amount_override != null ? pkgItem.discount_amount_override : ''}
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
                                    discount_percent: v === '' || !Number.isFinite(num) ? it.discount_percent : 0,
                                  }
                                : it
                            )
                          )
                        }}
                      />
                    </div>
                  </div>

                  {(pkgItem.selected_services || []).length > 0 && (
                    <div>
                      <Label className="mb-2 block">Services — status & employees (per service)</Label>
                      <div className="space-y-2 max-h-60 overflow-auto">
                        {pkgItem.selected_services.map((svc, svcIdx) => {
                          const currentIds = svc.employee_ids || []
                          const slots = currentIds.length ? currentIds : ['']
                          return (
                            <div key={svcIdx} className="p-2 bg-gray-50 rounded border space-y-2">
                              <div className="text-sm font-medium truncate flex items-center gap-1.5 flex-wrap">
                                {svc.service_name}
                                {(svc.star_points || 0) > 0 && (
                                  <span className="inline-flex items-center text-amber-600 text-xs font-normal shrink-0">
                                    <Star className="h-3 w-3 fill-amber-500" />
                                    {svc.star_points}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatCurrency(svc.distributed_price ?? svc.original_service_price)}
                                {svc.distributed_price != null && svc.distributed_price !== svc.original_service_price && (
                                  <span className="line-through text-gray-300 ml-1">{formatCurrency(svc.original_service_price)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Label className="text-xs text-gray-500">Status</Label>
                                <button
                                  type="button"
                                  onClick={() => togglePackageServicePending(editingItemIndex, svcIdx)}
                                  className={`text-xs px-2 py-1 rounded border font-medium ${
                                    svc.item_status === 'pending'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50'
                                  }`}
                                >
                                  {svc.item_status === 'pending' ? 'Pending' : 'Done'}
                                </button>
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
                                      updatePackageServiceEmployees(editingItemIndex, svcIdx, updated)
                                    }}
                                  >
                                    <option value="">— None —</option>
                                    {employees.filter((emp) => {
                                      const othersSelected = currentIds.filter((id, i) => i !== slotIdx && id).map(String)
                                      return !othersSelected.includes(String(emp.employee_id))
                                    }).map((emp) => (
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
                                      updatePackageServiceEmployees(editingItemIndex, svcIdx, updated.length ? updated : [])
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
                                  updatePackageServiceEmployees(editingItemIndex, svcIdx, [...currentIds, ''])
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add employee
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <DialogFooter className="gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleRemoveItem(editingItemIndex)
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
          {editingItemIndex !== null && cartItems[editingItemIndex]?.item_type !== 'package' && cartItems[editingItemIndex] && (
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
                            {employees.filter((emp) => {
                              const currentIds = cartItems[editingItemIndex]?.employee_ids || []
                              const othersSelected = currentIds.filter((id, i) => i !== slotIdx && id).map(String)
                              return !othersSelected.includes(String(emp.employee_id))
                            }).map((emp) => (
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

      {/* Inline Add Customer Modal */}
      <CustomerModal
        open={addCustomerModalOpen}
        onOpenChange={setAddCustomerModalOpen}
        minimal
        prefill={customerPrefill}
        onCreated={(newCustomer) => {
          handleSelectCustomer(newCustomer)
        }}
      />
    </div>
  )
}

export default BillCreatePage
