import { useState, useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Search, X, Check, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { tokenService } from '@/services/token.service'
import { customerService } from '@/services/customer.service'
import { serviceService } from '@/services/service.service'
import { fuzzyMatch, fuzzyScore } from '@/lib/utils'
import { printTokenSlip } from '@/components/TokenSlip'
import TokenQrCode from '@/components/TokenQrCode'

function CreateTokenModal({ open, onOpenChange, branchId }) {
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const effectiveBranchId = branchId || user?.branchId || null

  // Customer state — mirrors BillCreatePage pattern
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [newCustomerMode, setNewCustomerMode] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  // Items state — combined services + packages
  const [itemSearch, setItemSearch] = useState('')
  const [itemKindFilter, setItemKindFilter] = useState('all')
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])  // [{ kind, id, name }]

  const [notes, setNotes] = useState('')
  const [createdToken, setCreatedToken] = useState(null)

  const customerBoxRef = useRef(null)
  const itemBoxRef = useRef(null)

  // Close dropdowns when clicking outside their containers
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target)) {
        setShowCustomerDropdown(false)
      }
      if (itemBoxRef.current && !itemBoxRef.current.contains(e.target)) {
        setShowItemDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reset on open
  useEffect(() => {
    if (open) {
      setCustomerSearch('')
      setShowCustomerDropdown(false)
      setSelectedCustomer(null)
      setNewCustomerMode(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      setItemSearch('')
      setItemKindFilter('all')
      setShowItemDropdown(false)
      setSelectedItems([])
      setNotes('')
      setCreatedToken(null)
    }
  }, [open])

  // Customer search query (debounced via the queryKey + min length 2)
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => customerService.getCustomers({ search: customerSearch, limit: 10 }),
    enabled: open && customerSearch.length >= 2,
  })
  const customers = customersData?.data || []

  // Services + packages
  const { data: servicesData } = useQuery({
    queryKey: ['services', 'active'],
    queryFn: () => serviceService.getServices({ is_active: 'true' }),
    enabled: open,
  })
  const { data: packagesData } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => serviceService.getPackages({ is_active: 'true' }),
    enabled: open,
  })

  const itemOptions = useMemo(() => {
    const services = (servicesData?.data || []).map((s) => ({
      kind: 'service',
      id: s.service_id,
      name: s.service_name,
      price: s.price,
      category: s.category?.name,
    }))
    const packages = (packagesData?.data || []).map((p) => {
      const standaloneCount = (p.services || []).reduce((sum, s) => sum + (s.quantity || 1), 0)
      const groupCount = (p.service_groups || []).length
      const serviceCount = standaloneCount + groupCount
      return {
        kind: 'package',
        id: p.package_id,
        name: p.package_name,
        price: p.package_price ?? p.individual_price ?? 0,
        serviceCount,
        savings: p.savings,
      }
    })
    return [...services, ...packages]
  }, [servicesData, packagesData])

  const filteredItems = useMemo(() => {
    const q = (itemSearch || '').trim()
    const selectedKey = (it) => `${it.kind}:${it.id}`
    const selectedSet = new Set(selectedItems.map(selectedKey))
    let pool = itemOptions.filter((o) => !selectedSet.has(selectedKey(o)))
    if (itemKindFilter === 'service') pool = pool.filter((o) => o.kind === 'service')
    if (itemKindFilter === 'package') pool = pool.filter((o) => o.kind === 'package')
    if (!q) return pool.slice(0, 25)
    return pool
      .filter((o) => fuzzyMatch(o.name || '', q))
      .sort((a, b) => fuzzyScore(b.name || '', q) - fuzzyScore(a.name || '', q))
      .slice(0, 25)
  }, [itemOptions, itemSearch, selectedItems, itemKindFilter])

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.customer_name)
    setShowCustomerDropdown(false)
    setNewCustomerMode(false)
  }

  const handleStartNewCustomer = () => {
    setSelectedCustomer(null)
    setNewCustomerMode(true)
    setShowCustomerDropdown(false)
    // Pre-fill name from search if it doesn't look like a phone
    const looksLikePhone = /^\d{6,}$/.test(customerSearch.replace(/\s+/g, ''))
    if (looksLikePhone) {
      setNewCustomerPhone(customerSearch.replace(/\s+/g, ''))
      setNewCustomerName('')
    } else {
      setNewCustomerName(customerSearch)
      setNewCustomerPhone('')
    }
  }

  const addItem = (item) => {
    setSelectedItems((prev) => [...prev, item])
    setItemSearch('')
    setShowItemDropdown(false)
  }
  const removeItem = (kind, id) => {
    setSelectedItems((prev) => prev.filter((it) => !(it.kind === kind && it.id === id)))
  }

  const createMutation = useMutation({
    mutationFn: tokenService.createToken,
    onSuccess: (res) => {
      const token = res?.data
      toast.success(`Token ${token?.token_number} created`)
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      if (token) {
        setCreatedToken(token)
        printTokenSlip(token).catch(() => {})
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create token')
    },
  })

  const handleClose = (nextOpen) => {
    if (!nextOpen) setCreatedToken(null)
    onOpenChange(nextOpen)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!effectiveBranchId) {
      toast.error('No branch selected')
      return
    }

    let customerPayload
    if (selectedCustomer) {
      customerPayload = { customer_id: selectedCustomer.customer_id }
    } else if (newCustomerMode) {
      const name = newCustomerName.trim()
      const phone = newCustomerPhone.trim()
      if (!name) {
        toast.error('Customer name is required')
        return
      }
      customerPayload = phone
        ? { phone, customer_name: name }
        : { customer_name: name }
    } else {
      toast.error('Please select a customer (or click "Add New")')
      return
    }

    const service_ids = selectedItems.filter((i) => i.kind === 'service').map((i) => i.id)
    const package_ids = selectedItems.filter((i) => i.kind === 'package').map((i) => i.id)

    createMutation.mutate({
      branch_id: effectiveBranchId,
      customer: customerPayload,
      service_ids: service_ids.length > 0 ? service_ids : undefined,
      package_ids: package_ids.length > 0 ? package_ids : undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Token created</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Token number</p>
                <p className="text-3xl font-bold tracking-wide text-primary">{createdToken.token_number}</p>
                <p className="text-sm text-gray-700 mt-2">{createdToken.customer_name_snap}</p>
                {createdToken.customer_phone_snap && (
                  <p className="text-xs text-gray-500">{createdToken.customer_phone_snap}</p>
                )}
              </div>
              {(createdToken.services_requested?.length ?? 0) > 0 && (
                <div className="rounded-md border bg-gray-50 p-3 text-sm space-y-1">
                  <p className="text-xs font-medium text-gray-600 mb-2">Requested items</p>
                  {createdToken.services_requested.map((it, i) => (
                    <div key={`${it.kind || 'service'}-${it.package_id || it.service_id || i}`} className="flex items-center gap-2">
                      <span className={it.kind === 'package' ? 'text-violet-700 text-xs font-medium' : 'text-primary text-xs font-medium'}>
                        {it.kind === 'package' ? 'Package' : 'Service'}
                      </span>
                      <span className="text-gray-800">{it.name || it.service_name}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <TokenQrCode token={createdToken} size={180} />
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  Scan this QR at billing to load the customer, services, and packages automatically.
                </p>
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 text-center">
                Testing mode — token billing is still being refined. If something does not load correctly, staff can add items manually. Sorry for any inconvenience.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => printTokenSlip(createdToken)}
              >
                Print slip
              </Button>
              <Button type="button" onClick={() => handleClose(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle>New Token</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer search (billing-style) */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            {!newCustomerMode ? (
              <div className="relative" ref={customerBoxRef}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Customer name, phone or ID..."
                    className="pl-8 pr-8"
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
                          onClick={handleStartNewCustomer}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Add New
                        </Button>
                      </div>
                    ) : (
                      <>
                        {customers.map((customer) => (
                          <div
                            key={customer.customer_id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="font-medium text-sm">{customer.customer_name}</div>
                            <div className="text-xs text-gray-500">
                              {customer.phone || customer.phone_masked || '—'}
                              {customer.customer_code ? ` · ${customer.customer_code}` : ''}
                            </div>
                          </div>
                        ))}
                        <div
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-t flex items-center gap-1.5 text-primary text-sm"
                          onClick={handleStartNewCustomer}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Add new customer
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 rounded-md border p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">New customer</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => { setNewCustomerMode(false); setNewCustomerName(''); setNewCustomerPhone('') }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="new_phone" className="text-xs">Phone</Label>
                    <Input
                      id="new_phone"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="98765 43210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_name" className="text-xs">Name *</Label>
                    <Input
                      id="new_name"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Walk-in"
                      autoFocus
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  If a customer with this phone already exists, we'll reuse it instead of creating a duplicate.
                </p>
              </div>
            )}
          </div>

          {/* Services + Packages search */}
          <div className="space-y-2">
            <Label>Services &amp; packages (optional)</Label>

            <Tabs value={itemKindFilter} onValueChange={setItemKindFilter}>
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="service" className="text-xs">Services</TabsTrigger>
                <TabsTrigger value="package" className="text-xs">Packages</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Selected chips */}
            {selectedItems.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 rounded-md border bg-gray-50">
                {selectedItems.map((it) => (
                  <span
                    key={`${it.kind}:${it.id}`}
                    className={
                      it.kind === 'package'
                        ? 'inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800'
                        : 'inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary'
                    }
                  >
                    {it.kind === 'package' ? '📦 ' : ''}
                    {it.name}
                    <button
                      type="button"
                      onClick={() => removeItem(it.kind, it.id)}
                      className="rounded-full p-0.5 hover:bg-black/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative" ref={itemBoxRef}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder={
                    itemKindFilter === 'package'
                      ? 'Search packages...'
                      : itemKindFilter === 'service'
                        ? 'Search services...'
                        : 'Search services or packages...'
                  }
                  className="pl-8"
                  value={itemSearch}
                  onChange={(e) => { setItemSearch(e.target.value); setShowItemDropdown(true) }}
                  onFocus={() => setShowItemDropdown(true)}
                />
              </div>
              {showItemDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredItems.length === 0 ? (
                    <div className="p-3 text-center text-sm text-gray-500">No matches</div>
                  ) : (
                    filteredItems.map((it) => (
                      <div
                        key={`${it.kind}:${it.id}`}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between gap-2"
                        onClick={() => addItem(it)}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {it.kind === 'package' && '📦 '}
                            {it.name}
                          </div>
                          {it.kind === 'service' && it.category && (
                            <div className="text-xs text-gray-500">{it.category}</div>
                          )}
                          {it.kind === 'package' && (
                            <div className="text-xs text-gray-500">
                              {it.serviceCount > 0 ? `${it.serviceCount} service${it.serviceCount === 1 ? '' : 's'}` : 'Package'}
                              {it.savings > 0 ? ` · save ₹${Number(it.savings).toFixed(0)}` : ''}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">
                          ₹{Number(it.price || 0).toFixed(0)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Optional — add individual services and combo packages. Billing will load them when this token is scanned.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prefers Reema"
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create &amp; Print
            </Button>
          </DialogFooter>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CreateTokenModal
