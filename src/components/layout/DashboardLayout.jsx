import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'

function DashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { collapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600/75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div
        className={`transition-[padding-left] duration-200 ease-in-out ${
          collapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} />

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
