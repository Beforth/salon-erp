import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { userService } from '@/services/user.service'
import { branchService } from '@/services/branch.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  User,
  Briefcase,
  CreditCard,
  Package,
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner' },
]

const initialFormData = {
  username: '',
  email: '',
  password: '',
  full_name: '',
  phone: '',
  role: 'employee',
  branch_id: '',
  additional_branches: [],
  is_active: true,
  // Employee details
  employee_code: '',
  joining_date: '',
  date_of_birth: '',
  address: '',
  aadhar_number: '',
  pan_number: '',
  base_salary: '',
  bank_account_number: '',
  bank_name: '',
  bank_ifsc: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

const initialAssetForm = {
  name: '',
  amount: '',
  quantity: '1',
}

function StaffFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const isOwner = user?.role === 'owner' || user?.role === 'developer'
  const isEditing = !!id

  const [formData, setFormData] = useState(initialFormData)
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'basic')

  // Asset state
  const [assetForm, setAssetForm] = useState(initialAssetForm)
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState(null)

  // Fetch user data when editing
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUserById(id),
    enabled: isEditing,
  })

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
  })

  const branches = branchesData?.data || []

  // Fetch assets (only when editing)
  const { data: assetsData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['user-assets', id],
    queryFn: () => userService.getEmployeeAssets(id),
    enabled: isEditing,
  })

  const assets = assetsData?.data || []

  const totalAssetsValue = useMemo(() => {
    return assets.reduce((sum, asset) => {
      return sum + (parseFloat(asset.amount) || 0) * (parseInt(asset.quantity) || 0)
    }, 0)
  }, [assets])

  // Populate form when user data loads
  useEffect(() => {
    if (userData?.data) {
      const staff = userData.data
      setFormData({
        username: staff.username || '',
        email: staff.email || '',
        password: '',
        full_name: staff.full_name || '',
        phone: staff.phone || '',
        role: staff.role || 'employee',
        branch_id: staff.branch_id || '',
        additional_branches: (staff.additional_branches || []).map(b => b.branch_id),
        is_active: staff.is_active ?? true,
        employee_code: staff.employee_details?.employee_code || '',
        joining_date: staff.employee_details?.joining_date?.split('T')[0] || '',
        date_of_birth: staff.employee_details?.date_of_birth?.split('T')[0] || '',
        address: staff.employee_details?.address || '',
        aadhar_number: staff.employee_details?.aadhar_number || '',
        pan_number: staff.employee_details?.pan_number || '',
        base_salary: staff.employee_details?.base_salary || '',
        bank_account_number: staff.employee_details?.bank_account_number || '',
        bank_name: staff.employee_details?.bank_name || '',
        bank_ifsc: staff.employee_details?.bank_ifsc || '',
        emergency_contact_name: staff.employee_details?.emergency_contact_name || '',
        emergency_contact_phone: staff.employee_details?.emergency_contact_phone || '',
      })
    } else if (!isEditing) {
      setFormData({
        ...initialFormData,
        branch_id: user?.branchId || '',
      })
    }
  }, [userData, isEditing, user])

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: (response) => {
      toast.success('Staff member created successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const newUserId = response?.data?.user_id
      if (newUserId) {
        navigate(`/staff/${newUserId}/edit`, { state: { tab: 'assets' } })
      } else {
        navigate('/staff')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create staff member')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => userService.updateUser(id, data),
    onSuccess: () => {
      toast.success('Staff member updated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate('/staff')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update staff member')
    },
  })

  const addAssetMutation = useMutation({
    mutationFn: (data) => userService.addEmployeeAsset(id, data),
    onSuccess: () => {
      toast.success('Asset added successfully')
      queryClient.invalidateQueries({ queryKey: ['user-assets', id] })
      resetAssetForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add asset')
    },
  })

  const updateAssetMutation = useMutation({
    mutationFn: ({ assetId, data }) => userService.updateEmployeeAsset(id, assetId, data),
    onSuccess: () => {
      toast.success('Asset updated successfully')
      queryClient.invalidateQueries({ queryKey: ['user-assets', id] })
      resetAssetForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update asset')
    },
  })

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId) => userService.deleteEmployeeAsset(id, assetId),
    onSuccess: () => {
      toast.success('Asset deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['user-assets', id] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete asset')
    },
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isAssetSubmitting = addAssetMutation.isPending || updateAssetMutation.isPending

  // --- Handlers ---

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.full_name.trim()) {
      toast.error('Full name is required')
      setActiveTab('basic')
      return
    }
    if (!isEditing && !formData.username.trim()) {
      toast.error('Username is required')
      setActiveTab('basic')
      return
    }
    if (!isEditing && !formData.password) {
      toast.error('Password is required')
      setActiveTab('basic')
      return
    }

    const data = {
      ...formData,
      base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
    }

    // Remove password if empty (for edits)
    if (!data.password) {
      delete data.password
    }

    if (isEditing) {
      updateMutation.mutate({ id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const resetAssetForm = () => {
    setAssetForm(initialAssetForm)
    setShowAssetForm(false)
    setEditingAssetId(null)
  }

  const handleAssetSubmit = () => {
    if (!assetForm.name.trim()) {
      toast.error('Asset name is required')
      return
    }
    if (!assetForm.amount || parseFloat(assetForm.amount) <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    if (!assetForm.quantity || parseInt(assetForm.quantity) <= 0) {
      toast.error('Quantity must be at least 1')
      return
    }

    const payload = {
      name: assetForm.name.trim(),
      amount: parseFloat(assetForm.amount),
      quantity: parseInt(assetForm.quantity),
    }

    if (editingAssetId) {
      updateAssetMutation.mutate({ assetId: editingAssetId, data: payload })
    } else {
      addAssetMutation.mutate(payload)
    }
  }

  const handleEditAsset = (asset) => {
    setAssetForm({
      name: asset.name || '',
      amount: asset.amount?.toString() || '',
      quantity: asset.quantity?.toString() || '1',
    })
    setEditingAssetId(asset.id)
    setShowAssetForm(true)
  }

  const handleDeleteAsset = (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      deleteAssetMutation.mutate(assetId)
    }
  }

  // --- Loading state ---

  if (isEditing && isLoadingUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/staff')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/staff" className="hover:text-foreground transition-colors">
              Staff
            </Link>
            <span>/</span>
            <span className="text-foreground">
              {isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${isEditing ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="basic" className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="employment" className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  Employment
                </TabsTrigger>
                <TabsTrigger value="bank" className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" />
                  Bank
                </TabsTrigger>
                {isEditing && (
                  <TabsTrigger value="assets" className="flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    Assets
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ==================== Basic Info Tab ==================== */}
              <TabsContent value="basic" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username {!isEditing && '*'}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleChange('username', e.target.value)}
                      placeholder="johndoe"
                      disabled={isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password {!isEditing && '*'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder={isEditing ? 'Leave blank to keep current' : 'Enter password'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <select
                      id="role"
                      className="w-full h-10 px-3 border rounded-md"
                      value={formData.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                    >
                      {ROLES.filter(r => isOwner || r.value !== 'owner').map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch_id">Primary Branch *</Label>
                    <select
                      id="branch_id"
                      className="w-full h-10 px-3 border rounded-md"
                      value={formData.branch_id}
                      onChange={(e) => {
                        handleChange('branch_id', e.target.value)
                        handleChange(
                          'additional_branches',
                          formData.additional_branches.filter(bid => bid !== e.target.value)
                        )
                      }}
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch.branch_id} value={branch.branch_id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 flex items-end">
                    <label className="flex items-center gap-2 h-10">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => handleChange('is_active', e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>

                {isOwner && ['employee', 'manager', 'cashier'].includes(formData.role) && branches.length > 1 && formData.branch_id && (
                  <div className="space-y-2">
                    <Label>Additional Branches</Label>
                    <div className="flex flex-wrap gap-3 p-3 border rounded-md max-h-32 overflow-y-auto">
                      {branches
                        .filter(b => b.branch_id !== formData.branch_id)
                        .map(b => (
                          <label key={b.branch_id} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.additional_branches.includes(b.branch_id)}
                              onChange={(e) => {
                                const current = formData.additional_branches
                                if (e.target.checked) {
                                  handleChange('additional_branches', [...current, b.branch_id])
                                } else {
                                  handleChange('additional_branches', current.filter(bid => bid !== b.branch_id))
                                }
                              }}
                              className="h-4 w-4 rounded"
                            />
                            {b.name}
                          </label>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Employee will be available for selection in these branches during billing.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* ==================== Employment Tab ==================== */}
              <TabsContent value="employment" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_code">Employee Code</Label>
                    <Input
                      id="employee_code"
                      value={formData.employee_code}
                      onChange={(e) => handleChange('employee_code', e.target.value)}
                      placeholder="EMP-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joining_date">Joining Date</Label>
                    <Input
                      id="joining_date"
                      type="date"
                      value={formData.joining_date}
                      onChange={(e) => handleChange('joining_date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base_salary">Base Salary (&#8377;)</Label>
                    <Input
                      id="base_salary"
                      type="number"
                      value={formData.base_salary}
                      onChange={(e) => handleChange('base_salary', e.target.value)}
                      placeholder="25000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Full address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aadhar_number">Aadhar Number</Label>
                    <Input
                      id="aadhar_number"
                      value={formData.aadhar_number}
                      onChange={(e) => handleChange('aadhar_number', e.target.value)}
                      placeholder="1234 5678 9012"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input
                      id="pan_number"
                      value={formData.pan_number}
                      onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                      placeholder="Contact person name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ==================== Bank Details Tab ==================== */}
              <TabsContent value="bank" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                    placeholder="e.g., State Bank of India"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_account_number">Account Number</Label>
                    <Input
                      id="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={(e) => handleChange('bank_account_number', e.target.value)}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_ifsc">IFSC Code</Label>
                    <Input
                      id="bank_ifsc"
                      value={formData.bank_ifsc}
                      onChange={(e) => handleChange('bank_ifsc', e.target.value.toUpperCase())}
                      placeholder="e.g., SBIN0001234"
                      maxLength={11}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                  Bank details are used for salary disbursement. This information is kept confidential
                  and only accessible to owners and managers.
                </div>
              </TabsContent>

              {/* ==================== Assets Tab ==================== */}
              {isEditing && (
                <TabsContent value="assets" className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Assigned Assets</h3>
                      <p className="text-sm text-muted-foreground">
                        Track equipment, tools and items assigned to this staff member.
                      </p>
                    </div>
                    {!showAssetForm && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetAssetForm()
                          setShowAssetForm(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Asset
                      </Button>
                    )}
                  </div>

                  {/* Inline Add/Edit Form */}
                  {showAssetForm && (
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                      <p className="text-sm font-medium">
                        {editingAssetId ? 'Edit Asset' : 'New Asset'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="asset_name" className="text-xs">Name *</Label>
                          <Input
                            id="asset_name"
                            value={assetForm.name}
                            onChange={(e) => setAssetForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Hair Dryer"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="asset_amount" className="text-xs">Amount (&#8377;) *</Label>
                          <Input
                            id="asset_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={assetForm.amount}
                            onChange={(e) => setAssetForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="asset_quantity" className="text-xs">Quantity *</Label>
                          <Input
                            id="asset_quantity"
                            type="number"
                            min="1"
                            step="1"
                            value={assetForm.quantity}
                            onChange={(e) => setAssetForm(prev => ({ ...prev, quantity: e.target.value }))}
                            placeholder="1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAssetSubmit}
                          disabled={isAssetSubmitting}
                        >
                          {isAssetSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                          {editingAssetId ? 'Update' : 'Add'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetAssetForm}
                          disabled={isAssetSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Assets Table */}
                  {isLoadingAssets ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border rounded-lg">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No assets assigned yet.</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Amount (&#8377;)</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Total Value</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assets.map((asset) => (
                            <TableRow key={asset.id}>
                              <TableCell className="font-medium">{asset.name}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(asset.amount)}
                              </TableCell>
                              <TableCell className="text-right">{asset.quantity}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency((parseFloat(asset.amount) || 0) * (parseInt(asset.quantity) || 0))}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditAsset(asset)}
                                    disabled={isAssetSubmitting || deleteAssetMutation.isPending}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => handleDeleteAsset(asset.id)}
                                    disabled={deleteAssetMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={3} className="font-semibold">
                              Total Assets Value
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(totalAssetsValue)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/staff')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Staff' : 'Add Staff'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default StaffFormPage
