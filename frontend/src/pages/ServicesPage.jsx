import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { serviceService } from '@/services/service.service'
import { branchService } from '@/services/branch.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ServiceModal from '@/components/modals/ServiceModal'
import CategoryModal from '@/components/modals/CategoryModal'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Scissors, Loader2, Star, Building2, Pencil, FolderPlus, ChevronDown } from 'lucide-react'

function ServicesPage() {
  const { user } = useSelector((state) => state.auth)
  const userBranchId = user?.branchId || null

  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(userBranchId || '')
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)

  // Fetch branches for owner
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
    enabled: !userBranchId,
  })

  const branches = branchesData?.data || []

  const { data, isLoading, error } = useQuery({
    queryKey: ['services', { search, branch_id: selectedBranch || userBranchId }],
    queryFn: () => serviceService.getServices({
      search,
      is_active: 'true',
      branch_id: selectedBranch || userBranchId
    }),
  })

  const services = data?.data || []

  const handleAddService = () => {
    setEditingService(null)
    setServiceModalOpen(true)
  }

  const handleEditService = (service) => {
    setEditingService(service)
    setServiceModalOpen(true)
  }

  const handleAddCategory = () => {
    setCategoryModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500">Manage your service catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddCategory}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={handleAddService}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search services..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Branch filter for owners */}
            {!userBranchId && (
              <div className="w-64">
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">All Branches</option>
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

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Service Catalog
            <Badge variant="secondary" className="ml-2">
              {services.length} services
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              Error loading services. Please try again.
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Scissors className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No services found.</p>
              <Button className="mt-4" onClick={handleAddService}>
                Add Your First Service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Category</TableHead>
                  {!userBranchId && <TableHead>Branch</TableHead>}
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Star Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.service_id}>
                    <TableCell className="font-medium">
                      {service.service_name}
                    </TableCell>
                    <TableCell>
                      {service.category?.category_name || '-'}
                    </TableCell>
                    {!userBranchId && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          {service.branch?.name || '-'}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-bold">
                      {formatCurrency(service.price)}
                    </TableCell>
                    <TableCell>
                      {service.duration_minutes
                        ? `${service.duration_minutes} min`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
                        {service.star_points}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? 'success' : 'secondary'}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditService(service)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ServiceModal
        open={serviceModalOpen}
        onOpenChange={setServiceModalOpen}
        service={editingService}
      />
      <CategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
      />
    </div>
  )
}

export default ServicesPage
