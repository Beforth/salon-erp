import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Receipt,
  Scissors,
  Package,
  Warehouse,
  BarChart3,
  Settings,
  Building2,
  ShoppingBag,
  Upload,
  ArrowRightLeft,
  UserCog,
  Calculator,
} from 'lucide-react'

const getNavItemsByRole = (role) => {
  const allNavItems = [
    {
      title: 'Dashboard',
      href: '/dashboard/owner',
      icon: LayoutDashboard,
      roles: ['owner', 'developer'],
    },
    {
      title: 'Dashboard',
      href: '/dashboard/manager',
      icon: LayoutDashboard,
      roles: ['manager'],
    },
    {
      title: 'Dashboard',
      href: '/dashboard/cashier',
      icon: LayoutDashboard,
      roles: ['cashier'],
    },
    {
      title: 'Dashboard',
      href: '/dashboard/employee',
      icon: LayoutDashboard,
      roles: ['employee'],
    },
    {
      title: 'Customers',
      href: '/customers',
      icon: Users,
      roles: ['owner', 'developer', 'manager', 'cashier'],
    },
    {
      title: 'Billing',
      href: '/bills',
      icon: Receipt,
      roles: ['owner', 'developer', 'manager', 'cashier'],
    },
    {
      title: 'Services',
      href: '/services',
      icon: Scissors,
      roles: ['owner', 'developer', 'manager'],
    },
    {
      title: 'Packages',
      href: '/packages',
      icon: Package,
      roles: ['owner', 'developer', 'manager'],
    },
    {
      title: 'Products',
      href: '/products',
      icon: ShoppingBag,
      roles: ['owner', 'developer', 'manager'],
    },
    {
      title: 'Inventory',
      href: '/inventory',
      icon: Warehouse,
      roles: ['owner', 'developer', 'manager'],
    },
    {
      title: 'Stock Transfers',
      href: '/inventory/transfers',
      icon: ArrowRightLeft,
      roles: ['owner', 'developer', 'manager'],
    },
    {
      title: 'Import Bills',
      href: '/bills/import',
      icon: Upload,
      roles: ['owner', 'developer', 'manager'],
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: BarChart3,
      roles: ['owner', 'developer', 'manager'],
    },
    {
      title: 'Cash Drawer',
      href: '/cash-reconciliation',
      icon: Calculator,
      roles: ['owner', 'developer', 'manager', 'cashier'],
    },
    {
      title: 'Staff',
      href: '/staff',
      icon: UserCog,
      roles: ['owner', 'developer', 'manager'],
    },
    {
      title: 'Branches',
      href: '/branches',
      icon: Building2,
      roles: ['owner', 'developer'],
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: ['owner', 'developer'],
    },
  ]

  return allNavItems.filter((item) => item.roles.includes(role))
}

function Sidebar() {
  const { user } = useSelector((state) => state.auth)
  const navItems = getNavItemsByRole(user?.role || 'employee')

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Salon ERP</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center w-full">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user?.fullName?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName || 'User'}
              </p>
              <p className="text-xs text-gray-500 capitalize truncate">
                {user?.role || 'Role'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
