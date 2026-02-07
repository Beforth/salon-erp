import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { importService } from '@/services/import.service'
import { branchService } from '@/services/branch.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'

const FIELD_OPTIONS = [
  { value: '', label: 'Do not import' },
  { value: 'customer_name', label: 'Customer Name' },
  { value: 'customer_phone', label: 'Customer Phone' },
  { value: 'service_name', label: 'Service Name' },
  { value: 'amount', label: 'Amount' },
  { value: 'bill_date', label: 'Bill Date' },
  { value: 'employee_name', label: 'Employee Name' },
  { value: 'payment_mode', label: 'Payment Mode' },
  { value: 'discount', label: 'Discount' },
]

function BillImportPage() {
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1) // 1: Upload, 2: Map Fields, 3: Review, 4: Results
  const [file, setFile] = useState(null)
  const [uploadedData, setUploadedData] = useState(null)
  const [fieldMapping, setFieldMapping] = useState({})
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId || '')
  const [createMissingCustomers, setCreateMissingCustomers] = useState(true)
  const [importResults, setImportResults] = useState(null)

  const branchId = user?.branchId || null

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
    enabled: !branchId,
  })

  const branches = branchesData?.data || []

  const uploadMutation = useMutation({
    mutationFn: importService.uploadCSV,
    onSuccess: (data) => {
      setUploadedData(data.data)
      // Auto-map fields based on header names
      const autoMapping = {}
      data.data.headers.forEach((header) => {
        const headerLower = header.toLowerCase()
        if (headerLower.includes('customer') && headerLower.includes('name')) {
          autoMapping[header] = 'customer_name'
        } else if (headerLower.includes('phone') || headerLower.includes('mobile')) {
          autoMapping[header] = 'customer_phone'
        } else if (headerLower.includes('service')) {
          autoMapping[header] = 'service_name'
        } else if (headerLower.includes('amount') || headerLower.includes('total') || headerLower.includes('price')) {
          autoMapping[header] = 'amount'
        } else if (headerLower.includes('date')) {
          autoMapping[header] = 'bill_date'
        } else if (headerLower.includes('employee') || headerLower.includes('staff')) {
          autoMapping[header] = 'employee_name'
        } else if (headerLower.includes('payment') || headerLower.includes('mode')) {
          autoMapping[header] = 'payment_mode'
        } else if (headerLower.includes('discount')) {
          autoMapping[header] = 'discount'
        }
      })
      setFieldMapping(autoMapping)
      setStep(2)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to upload file')
    },
  })

  const importMutation = useMutation({
    mutationFn: importService.importBills,
    onSuccess: (data) => {
      setImportResults(data.data)
      setStep(4)
      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`Import complete: ${data.data.success} bills created`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Import failed')
    },
  })

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleUpload = () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }
    uploadMutation.mutate(file)
  }

  const handleMappingChange = (header, value) => {
    setFieldMapping((prev) => ({
      ...prev,
      [header]: value,
    }))
  }

  const getReverseMappings = () => {
    const reverse = {}
    Object.entries(fieldMapping).forEach(([header, field]) => {
      if (field) {
        reverse[field] = header
      }
    })
    return reverse
  }

  const handleImport = () => {
    const reverseMappings = getReverseMappings()

    if (!reverseMappings.customer_name && !reverseMappings.customer_phone) {
      toast.error('Please map Customer Name or Customer Phone')
      return
    }
    if (!reverseMappings.service_name) {
      toast.error('Please map Service Name')
      return
    }
    if (!reverseMappings.amount) {
      toast.error('Please map Amount')
      return
    }

    const branchToUse = branchId || selectedBranch
    if (!branchToUse) {
      toast.error('Please select a branch')
      return
    }

    importMutation.mutate({
      records: uploadedData.preview.length === uploadedData.total_records
        ? uploadedData.preview
        : uploadedData.preview, // In a real app, you'd use all records
      field_mapping: reverseMappings,
      branch_id: branchToUse,
      create_missing_customers: createMissingCustomers,
    })
  }

  const downloadSampleCSV = () => {
    const sample = `Customer Name,Customer Phone,Service Name,Amount,Bill Date,Employee Name,Payment Mode,Discount
Raj Kumar,9876543210,Haircut - Premium,300,2026-01-15,Ramesh Kumar,cash,0
Priya Sharma,9876543211,Hair Spa,800,2026-01-16,Suresh Patil,upi,50
Amit Singh,9876543212,Beard Trim,80,2026-01-17,Ramesh Kumar,card,0`

    const blob = new Blob([sample], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_bills_import.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const reverseMappings = getReverseMappings()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Bills</h1>
        <p className="text-gray-500">Import historical bills from CSV file</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s === step
                  ? 'bg-primary text-white'
                  : s < step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`w-16 h-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-8 text-sm text-gray-500">
        <span className={step === 1 ? 'text-primary font-medium' : ''}>Upload</span>
        <span className={step === 2 ? 'text-primary font-medium' : ''}>Map Fields</span>
        <span className={step === 3 ? 'text-primary font-medium' : ''}>Review</span>
        <span className={step === 4 ? 'text-primary font-medium' : ''}>Results</span>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Upload a CSV file containing bill data to import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => document.getElementById('file-input').click()}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              {file ? (
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-900">
                    Click to select a CSV file
                  </p>
                  <p className="text-sm text-gray-500">or drag and drop</p>
                </div>
              )}
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={downloadSampleCSV}>
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload & Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map Fields */}
      {step === 2 && uploadedData && (
        <Card>
          <CardHeader>
            <CardTitle>Map Fields</CardTitle>
            <CardDescription>
              Match CSV columns to bill fields. Found {uploadedData.total_records} records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {uploadedData.headers.map((header) => (
                <div key={header} className="flex items-center gap-4">
                  <div className="w-1/3">
                    <Badge variant="outline" className="font-mono">
                      {header}
                    </Badge>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <select
                    className="flex-1 h-10 px-3 border rounded-md"
                    value={fieldMapping[header] || ''}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                  >
                    {FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Import */}
      {step === 3 && uploadedData && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Import</CardTitle>
            <CardDescription>
              Review the mapping and preview data before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              {!branchId && (
                <div>
                  <Label>Branch *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md mt-1"
                    value={selectedBranch}
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
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="create-customers"
                  checked={createMissingCustomers}
                  onChange={(e) => setCreateMissingCustomers(e.target.checked)}
                />
                <label htmlFor="create-customers" className="text-sm">
                  Create missing customers automatically
                </label>
              </div>
            </div>

            {/* Mapping Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Field Mapping Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Customer Name: <span className="font-mono">{reverseMappings.customer_name || '(not mapped)'}</span></div>
                <div>Customer Phone: <span className="font-mono">{reverseMappings.customer_phone || '(not mapped)'}</span></div>
                <div>Service Name: <span className="font-mono">{reverseMappings.service_name || '(not mapped)'}</span></div>
                <div>Amount: <span className="font-mono">{reverseMappings.amount || '(not mapped)'}</span></div>
                <div>Bill Date: <span className="font-mono">{reverseMappings.bill_date || '(not mapped)'}</span></div>
                <div>Employee: <span className="font-mono">{reverseMappings.employee_name || '(not mapped)'}</span></div>
              </div>
            </div>

            {/* Preview Table */}
            <div>
              <h3 className="font-medium mb-2">Data Preview (first 5 rows)</h3>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {uploadedData.headers.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedData.preview.map((row, i) => (
                      <TableRow key={i}>
                        {uploadedData.headers.map((header) => (
                          <TableCell key={header} className="whitespace-nowrap">
                            {row[header] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {uploadedData.total_records} Bills
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 4 && importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {importResults.total}
                </div>
                <div className="text-sm text-gray-500">Total Records</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">
                  {importResults.success}
                </div>
                <div className="text-sm text-gray-500">Imported</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600">
                  {importResults.failed}
                </div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Errors ({importResults.errors.length})
                </h3>
                <div className="max-h-60 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.errors.map((error, i) => (
                        <TableRow key={i}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="text-red-600">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => {
                  setStep(1)
                  setFile(null)
                  setUploadedData(null)
                  setImportResults(null)
                }}
              >
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default BillImportPage
