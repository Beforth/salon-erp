import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shiftService } from '@/services/shift.service'
import { branchService } from '@/services/branch.service'
import { userService } from '@/services/user.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  SearchableSelect,
} from '@/components/ui/searchable-select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Clock, Loader2, Plus, Pencil, Power, PowerOff, Calendar, ChevronLeft, ChevronRight, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import RosterGrid from '@/components/shifts/RosterGrid'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const toYearMonth = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

function ShiftPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('shifts')

  const { user } = useSelector((state) => state.auth)
  const isOwnerDev = ['owner', 'developer'].includes(user?.role)
  const isOwner = user?.role === 'owner'
  const userBranchId = user?.branchId || user?.branch_id || user?.branch?.branch_id || user?.branch?.id || ''
  const [selectedBranchId, setSelectedBranchId] = useState(userBranchId)

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
  })
  const branches = branchesData?.data || []

  const { data: shiftsData, isLoading: shiftsLoading, error: shiftsError } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftService.getShifts(),
  })
  const shifts = shiftsData?.data || []

  const effectiveBranchId = isOwnerDev ? selectedBranchId : userBranchId

  const toggleMutation = useMutation({
    mutationFn: (id) => shiftService.toggleActive(id),
    onSuccess: () => {
      toast.success('Shift toggled')
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to toggle shift'),
  })

  const openAddModal = () => navigate('/shifts/new')
  const openEditModal = (shift) => navigate(`/shifts/${shift.id}/edit`)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
          <p className="text-gray-500">Manage shift definitions and employee assignments</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Employee Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Shift Definitions
              </CardTitle>
              {isOwner && (
                <Button size="sm" onClick={openAddModal}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Shift
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {shiftsLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : shiftsError ? (
                <div className="text-center py-10 text-red-500">Error loading shifts.</div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No shifts defined yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Employees</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className="font-medium">{shift.name}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{shift.start_time} – {shift.end_time}</span>
                          </TableCell>
                          <TableCell>
                            {shift.color_code ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border" style={{ backgroundColor: shift.color_code }} />
                                <span className="text-xs font-mono text-gray-500">{shift.color_code}</span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={shift.is_active ? 'success' : 'secondary'}>
                              {shift.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{shift.employee_count ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isOwner && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => openEditModal(shift)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleMutation.mutate(shift.id)}
                                    disabled={toggleMutation.isPending}
                                  >
                                    {shift.is_active ? <PowerOff className="h-4 w-4 text-gray-400" /> : <Power className="h-4 w-4 text-green-600" />}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          {isOwnerDev && (
            <div className="max-w-xs">
              <Label className="mb-1 block text-xs">Branch</Label>
              <SearchableSelect
                options={branches.map((b) => ({ value: b.branch_id, label: b.name }))}
                value={selectedBranchId}
                onChange={setSelectedBranchId}
                placeholder="All branches"
              />
            </div>
          )}
          <RosterGrid branchId={effectiveBranchId} />
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default ShiftPage
