import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { branchService } from '@/services/branch.service'
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
import BranchModal from '@/components/modals/BranchModal'
import { Building2, Plus, Loader2, MapPin, Phone, Mail, Pencil } from 'lucide-react'

function BranchesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
  })

  const branches = data?.data || []

  const handleAddBranch = () => {
    setEditingBranch(null)
    setModalOpen(true)
  }

  const handleEditBranch = (branch) => {
    setEditingBranch(branch)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-500">Manage your salon branches</p>
        </div>
        <Button onClick={handleAddBranch}>
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Branches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Branches
            <Badge variant="secondary" className="ml-2">
              {branches.length} branches
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
              Error loading branches. Please try again.
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No branches found.</p>
              <Button className="mt-4" onClick={handleAddBranch}>
                Add Your First Branch
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.branch_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {branch.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{branch.code}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {branch.address && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {branch.address}
                          </div>
                        )}
                        {branch.city && (
                          <div className="text-gray-500">
                            {branch.city}{branch.state ? `, ${branch.state}` : ''}
                            {branch.pincode ? ` - ${branch.pincode}` : ''}
                          </div>
                        )}
                        {!branch.address && !branch.city && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {branch.phone && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="h-3 w-3" />
                            {branch.phone}
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Mail className="h-3 w-3" />
                            {branch.email}
                          </div>
                        )}
                        {!branch.phone && !branch.email && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? 'success' : 'secondary'}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBranch(branch)}
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

      {/* Branch Modal */}
      <BranchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        branch={editingBranch}
      />
    </div>
  )
}

export default BranchesPage
