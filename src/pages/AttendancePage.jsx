import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import {
  Loader2, Clock, Coffee, CheckCircle2, XCircle, UserMinus, Zap,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { attendanceService } from '@/services/attendance.service'
import { branchService } from '@/services/branch.service'
import { machineService } from '@/services/machine.service'

const STATUS_META = {
  on_floor:     { label: 'On floor',     badge: 'success',     icon: CheckCircle2 },
  on_break:     { label: 'On break',     badge: 'warning',     icon: Coffee },
  checked_out:  { label: 'Checked out',  badge: 'secondary',   icon: Clock },
  not_arrived:  { label: 'Not arrived',  badge: 'outline',     icon: XCircle },
  on_leave:     { label: 'On leave',     badge: 'secondary',   icon: UserMinus },
}

function formatTimeStored(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export default function AttendancePage() {
  const { user } = useSelector((state) => state.auth)
  const queryClient = useQueryClient()
  const canAct = ['owner', 'developer', 'manager', 'cashier'].includes(user?.role)

  const [branchId, setBranchId] = useState(user?.branchId || '')
  const [leaveModal, setLeaveModal] = useState(null) // { employee, reason }
  const [leaveReason, setLeaveReason] = useState('')

  const { data: branchesData } = useQuery({
    queryKey: ['branches', 'active'],
    queryFn: () => branchService.getBranches({ is_active: 'true' }),
  })
  const branches = branchesData?.data || []

  const { data: machinesData } = useQuery({
    queryKey: ['machines', branchId],
    queryFn: () => machineService.list({ branch_id: branchId }),
    enabled: !!branchId,
  })
  const machines = machinesData?.data || []
  const defaultMachineNo = useMemo(
    () => machines.find((m) => m.is_active)?.machine_no || machines[0]?.machine_no || '',
    [machines]
  )

  const { data: rosterData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['attendance-today', branchId],
    queryFn: () => attendanceService.getTodayRoster({ branch_id: branchId }),
    enabled: !!branchId,
    refetchInterval: 60_000,
  })
  const roster = rosterData?.data

  const breakStartMutation = useMutation({
    mutationFn: (data) => attendanceService.startBreak(data),
    onSuccess: () => {
      toast.success('Break started')
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  })
  const breakEndMutation = useMutation({
    mutationFn: (data) => attendanceService.endBreak(data),
    onSuccess: () => {
      toast.success('Break ended')
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  })
  const markLeaveMutation = useMutation({
    mutationFn: (data) => attendanceService.markLeave(data),
    onSuccess: () => {
      toast.success('Marked on leave')
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
      setLeaveModal(null)
      setLeaveReason('')
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed'),
  })

  const handleBreak = (emp, type) => {
    if (!defaultMachineNo) {
      toast.error('Register a machine for this branch before marking breaks manually')
      return
    }
    const payload = {
      employee_code: emp.employee_code,
      machine_no: defaultMachineNo,
      reason: type === 'start' ? 'Break start (cashier)' : 'Break end (cashier)',
    }
    if (type === 'start') breakStartMutation.mutate(payload)
    else breakEndMutation.mutate(payload)
  }

  const openLeaveModal = (emp) => {
    setLeaveModal(emp)
    setLeaveReason('')
  }
  const submitLeave = () => {
    if (!roster) return
    markLeaveMutation.mutate({
      employee_id: leaveModal.employee_details_id || leaveModal.id,
      shop_date: new Date(roster.shop_date).toISOString().split('T')[0],
      reason: leaveReason || 'Marked by cashier',
      branch_id: branchId,
    })
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Today's Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {roster?.branch?.name ? `${roster.branch.name} · ` : ''}
            Shop date {roster?.shop_date ? new Date(roster.shop_date).toISOString().split('T')[0] : '—'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Label className="text-xs mb-1 block">Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!defaultMachineNo && branchId && (
            <p className="text-xs text-amber-600">
              No active machine registered for this branch. Manual break/leave actions need a machine.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !roster || roster.employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No employees assigned to this branch.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead>Late</TableHead>
                  {canAct && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.employees.map((emp) => {
                  const meta = STATUS_META[emp.current_status] || STATUS_META.not_arrived
                  const Icon = meta.icon
                  return (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="font-medium">{emp.full_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {emp.employee_code}
                          {emp.has_flexible_timing && (
                            <Badge variant="outline" className="ml-2 text-[10px] py-0">
                              <Zap className="h-3 w-3 mr-0.5" />flex
                            </Badge>
                          )}
                          {emp.shift_start && emp.shift_end && !emp.has_flexible_timing && (
                            <span className="ml-2">shift {emp.shift_start}–{emp.shift_end}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.badge}>
                          <Icon className="h-3 w-3 mr-1 inline" />{meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{formatTimeStored(emp.check_in)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatTimeStored(emp.check_out)}</TableCell>
                      <TableCell>{emp.total_break_minutes}m</TableCell>
                      <TableCell>{emp.working_hours != null ? `${emp.working_hours}h` : '—'}</TableCell>
                      <TableCell>
                        {Number(emp.late_penalty_hours) > 0
                          ? <span className="text-destructive">{emp.late_penalty_hours}h</span>
                          : '—'}
                      </TableCell>
                      {canAct && (
                        <TableCell className="text-right whitespace-nowrap">
                          {emp.current_status === 'on_floor' && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => handleBreak(emp, 'start')}
                              disabled={breakStartMutation.isPending}
                            >
                              Start break
                            </Button>
                          )}
                          {emp.current_status === 'on_break' && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => handleBreak(emp, 'end')}
                              disabled={breakEndMutation.isPending}
                            >
                              End break
                            </Button>
                          )}
                          {emp.current_status === 'not_arrived' && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => openLeaveModal(emp)}
                            >
                              Mark leave
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!leaveModal} onOpenChange={(o) => !o && setLeaveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {leaveModal?.full_name} on leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The employee will be excluded from today's billing roster.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Sick leave"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveModal(null)} disabled={markLeaveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submitLeave} disabled={markLeaveMutation.isPending}>
              {markLeaveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark on leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
