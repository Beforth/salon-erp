import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { settingsService } from '@/services/settings.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  Building2,
  Receipt,
  Globe,
  Bell,
  Users,
  Loader2,
  Save,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

function SettingsPage() {
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const isOwner = user?.role === 'owner' || user?.role === 'developer'

  const [formData, setFormData] = useState({})
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch settings
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings(),
  })

  const settings = data?.data || {}

  // Initialize form data when settings load
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      const initialData = {}
      Object.entries(settings).forEach(([key, setting]) => {
        initialData[key] = setting.value ?? ''
      })
      setFormData(initialData)
      setHasChanges(false)
    }
  }, [settings])

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: settingsService.updateSettings,
    onSuccess: () => {
      toast.success('Settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setHasChanges(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save settings')
    },
  })

  // Reset settings mutation
  const resetMutation = useMutation({
    mutationFn: settingsService.resetSettings,
    onSuccess: () => {
      toast.success('Settings reset to defaults')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reset settings')
    },
  })

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      resetMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        Error loading settings. Please try again.
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">View application settings</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            You don't have permission to modify settings. Contact your administrator.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your salon configuration</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="regional" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Regional</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Employees</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Configure your salon's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name || ''}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    placeholder="My Salon"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_tagline">Tagline</Label>
                  <Input
                    id="business_tagline"
                    value={formData.business_tagline || ''}
                    onChange={(e) => handleChange('business_tagline', e.target.value)}
                    placeholder="Your Beauty Partner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business_email">Email</Label>
                  <Input
                    id="business_email"
                    type="email"
                    value={formData.business_email || ''}
                    onChange={(e) => handleChange('business_email', e.target.value)}
                    placeholder="info@salon.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_phone">Phone</Label>
                  <Input
                    id="business_phone"
                    value={formData.business_phone || ''}
                    onChange={(e) => handleChange('business_phone', e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_address">Address</Label>
                <Input
                  id="business_address"
                  value={formData.business_address || ''}
                  onChange={(e) => handleChange('business_address', e.target.value)}
                  placeholder="Full business address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_website">Website</Label>
                <Input
                  id="business_website"
                  value={formData.business_website || ''}
                  onChange={(e) => handleChange('business_website', e.target.value)}
                  placeholder="https://www.salon.com"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Tax & Legal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="gst_number">GST Number</Label>
                    <Input
                      id="gst_number"
                      value={formData.gst_number || ''}
                      onChange={(e) => handleChange('gst_number', e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input
                      id="pan_number"
                      value={formData.pan_number || ''}
                      onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst_rate">GST Rate (%)</Label>
                    <Input
                      id="gst_rate"
                      type="number"
                      value={formData.gst_rate || ''}
                      onChange={(e) => handleChange('gst_rate', e.target.value)}
                      placeholder="18"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Billing Settings
              </CardTitle>
              <CardDescription>
                Configure bill generation and printing options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bill_prefix">Bill Number Prefix</Label>
                  <Input
                    id="bill_prefix"
                    value={formData.bill_prefix || ''}
                    onChange={(e) => handleChange('bill_prefix', e.target.value.toUpperCase())}
                    placeholder="BILL"
                  />
                  <p className="text-xs text-gray-500">
                    Bills will be numbered as {formData.bill_prefix || 'BILL'}-001, {formData.bill_prefix || 'BILL'}-002, etc.
                  </p>
                </div>
                <div className="space-y-2 flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.auto_print_bill === true || formData.auto_print_bill === 'true'}
                      onChange={(e) => handleChange('auto_print_bill', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span>Auto-print bill after completion</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill_footer_text">Bill Footer Text</Label>
                <Input
                  id="bill_footer_text"
                  value={formData.bill_footer_text || ''}
                  onChange={(e) => handleChange('bill_footer_text', e.target.value)}
                  placeholder="Thank you for visiting!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill_terms">Terms & Conditions</Label>
                <textarea
                  id="bill_terms"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  value={formData.bill_terms || ''}
                  onChange={(e) => handleChange('bill_terms', e.target.value)}
                  placeholder="Enter terms and conditions to display on bills"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regional Settings */}
        <TabsContent value="regional">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Regional Settings
              </CardTitle>
              <CardDescription>
                Configure date, time, and currency formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="default_currency">Currency</Label>
                  <select
                    id="default_currency"
                    className="w-full h-10 px-3 border rounded-md"
                    value={formData.default_currency || 'INR'}
                    onChange={(e) => handleChange('default_currency', e.target.value)}
                  >
                    <option value="INR">Indian Rupee (INR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency_symbol">Currency Symbol</Label>
                  <Input
                    id="currency_symbol"
                    value={formData.currency_symbol || ''}
                    onChange={(e) => handleChange('currency_symbol', e.target.value)}
                    placeholder="₹"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date_format">Date Format</Label>
                  <select
                    id="date_format"
                    className="w-full h-10 px-3 border rounded-md"
                    value={formData.date_format || 'DD/MM/YYYY'}
                    onChange={(e) => handleChange('date_format', e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_format">Time Format</Label>
                  <select
                    id="time_format"
                    className="w-full h-10 px-3 border rounded-md"
                    value={formData.time_format || '12h'}
                    onChange={(e) => handleChange('time_format', e.target.value)}
                  >
                    <option value="12h">12 Hour (2:30 PM)</option>
                    <option value="24h">24 Hour (14:30)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  className="w-full h-10 px-3 border rounded-md"
                  value={formData.timezone || 'Asia/Kolkata'}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                >
                  <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                  <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure alerts and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive email alerts for important events</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.email_notifications === true || formData.email_notifications === 'true'}
                    onChange={(e) => handleChange('email_notifications', e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-gray-500">Send SMS to customers for appointments</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.sms_enabled === true || formData.sms_enabled === 'true'}
                    onChange={(e) => handleChange('sms_enabled', e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                </label>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Inventory Alerts</h3>
                <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    value={formData.low_stock_threshold || ''}
                    onChange={(e) => handleChange('low_stock_threshold', e.target.value)}
                    placeholder="10"
                  />
                  <p className="text-xs text-gray-500">
                    Get alerts when product stock falls below this number
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Settings */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Settings
              </CardTitle>
              <CardDescription>
                Configure staff and attendance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Star Points System</p>
                  <p className="text-sm text-gray-500">Enable star points tracking for employees</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.star_points_enabled === true || formData.star_points_enabled === 'true'}
                  onChange={(e) => handleChange('star_points_enabled', e.target.checked)}
                  className="h-5 w-5 rounded"
                />
              </label>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Working Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="working_hours_start">Opening Time</Label>
                    <Input
                      id="working_hours_start"
                      type="time"
                      value={formData.working_hours_start || '09:00'}
                      onChange={(e) => handleChange('working_hours_start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="working_hours_end">Closing Time</Label>
                    <Input
                      id="working_hours_end"
                      type="time"
                      value={formData.working_hours_end || '21:00'}
                      onChange={(e) => handleChange('working_hours_end', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border shadow-lg rounded-lg px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-sm text-gray-600">You have unsaved changes</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const initialData = {}
              Object.entries(settings).forEach(([key, setting]) => {
                initialData[key] = setting.value ?? ''
              })
              setFormData(initialData)
              setHasChanges(false)
            }}
          >
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
