import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'

function DashboardContent() {
  const { collapsed, openMobile } = useSidebar()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar (handles both desktop & mobile drawer internally) */}
      <Sidebar />

      {/* Main content */}
      <div
        className={`transition-[padding-left] duration-200 ease-in-out ${
          collapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        <Header onMenuClick={openMobile} />

        <main className="py-6">
          <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${collapsed ? '' : 'max-w-7xl'}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  )
}

export default DashboardLayout
