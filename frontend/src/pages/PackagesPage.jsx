import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { serviceService } from '@/services/service.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PackageModal from '@/components/modals/PackageModal'
import { formatCurrency } from '@/lib/utils'
import { Package, Plus, Loader2, Pencil, Calendar, Tag } from 'lucide-react'

function PackagesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['packages'],
    queryFn: () => serviceService.getPackages(),
  })

  const packages = data?.data || []

  const handleAddPackage = () => {
    setEditingPackage(null)
    setModalOpen(true)
  }

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
          <p className="text-gray-500">Create and manage service packages</p>
        </div>
        <Button onClick={handleAddPackage}>
          <Plus className="h-4 w-4 mr-2" />
          Create Package
        </Button>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Packages
            <Badge variant="secondary" className="ml-2">
              {packages.length} packages
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
              Error loading packages. Please try again.
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No packages found.</p>
              <Button className="mt-4" onClick={handleAddPackage}>
                Create Your First Package
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Individual Price</TableHead>
                  <TableHead>Package Price</TableHead>
                  <TableHead>Savings</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.package_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        {pkg.package_name}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-gray-500 mt-1">{pkg.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {pkg.services?.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs mr-1">
                            {s.service_name} × {s.quantity}
                          </Badge>
                        ))}
                        {pkg.services?.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{pkg.services.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {pkg.total_services} services total
                      </p>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatCurrency(pkg.individual_price)}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {pkg.package_price != null
                        ? formatCurrency(pkg.package_price)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {pkg.savings > 0 ? (
                        <Badge variant="success" className="bg-green-100 text-green-700">
                          <Tag className="h-3 w-3 mr-1" />
                          Save {formatCurrency(pkg.savings)}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {pkg.validity_days} days
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pkg.is_active ? 'success' : 'secondary'}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPackage(pkg)}
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

      {/* Package Modal */}
      <PackageModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        pkg={editingPackage}
      />
    </div>
  )
}

export default PackagesPage
