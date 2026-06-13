import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logout } from '@/store/slices/authSlice'
import { cashService } from '@/services/cash.service'
import { notificationService } from '@/services/notification.service'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bell, Menu, LogOut, User, Settings, IndianRupee, ArrowRightLeft } from 'lucide-react'
import { useState } from 'react'

function Header({ onMenuClick }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useSelector((state) => state.auth)
  const isCashier = user?.role === 'cashier'
  const [showTooltip, setShowTooltip] = useState(false)

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications({ limit: 20 }),
    refetchInterval: 30000,
  })

  const notifications = notificationsData?.data?.notifications || []
  const unreadCount = notificationsData?.data?.unread_count ?? 0

  const markReadMutation = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handleNotificationClick = (n) => {
    if (!n.is_read) markReadMutation.mutate(n.notification_id)
    if (n.reference_type === 'stock_transfer' && n.reference_id) {
      navigate('/inventory/transfers')
    }
  }

  // Fetch today's summary for cashier only
  const { data: summaryData } = useQuery({
    queryKey: ['cash-summary-today', user?.branchId],
    queryFn: () => cashService.getDailySummary({
      date: new Date().toISOString().split('T')[0],
      branch_id: user?.branchId,
    }),
    enabled: isCashier && !!user?.branchId,
    refetchInterval: 60000, // Refresh every minute
  })

  const todayTotal = summaryData?.data?.total_revenue || 0

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 md:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search or breadcrumb area */}
        <div className="flex flex-1 items-center">
          {user?.branch && (
            <span className="text-sm text-gray-500">
              Branch: <span className="font-medium text-gray-900">{user.branch.name}</span>
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Today's bill amount icon - cashier only */}
          {isCashier && (
            <div
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Button variant="ghost" size="icon" className="relative">
                <IndianRupee className="h-5 w-5 text-gray-500" />
              </Button>
              {showTooltip && (
                <div className="absolute top-full right-0 mt-1 px-3 py-2 bg-gray-900 text-white text-sm rounded-md shadow-lg whitespace-nowrap z-50">
                  Today's Total: {formatCurrency(todayTotal)}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    Mark all read
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500 text-center">No notifications</p>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <DropdownMenuItem
                    key={n.notification_id}
                    className={`flex flex-col items-start gap-0.5 cursor-pointer ${!n.is_read ? 'bg-amber-50' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {n.type?.includes('stock_transfer') && (
                        <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                      <span className="font-medium text-sm truncate">{n.title}</span>
                    </div>
                    <span className="text-xs text-gray-500 line-clamp-2 pl-5">{n.message}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/inventory/transfers')}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Stock transfers
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.fullName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Header
