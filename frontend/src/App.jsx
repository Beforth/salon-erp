import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './components/layout/DashboardLayout'
import OwnerDashboard from './pages/dashboards/OwnerDashboard'
import ManagerDashboard from './pages/dashboards/ManagerDashboard'
import CashierDashboard from './pages/dashboards/CashierDashboard'
import EmployeeDashboard from './pages/dashboards/EmployeeDashboard'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import BillsPage from './pages/BillsPage'
import BillCreatePage from './pages/BillCreatePage'
import BillDetailPage from './pages/BillDetailPage'
import BillImportPage from './pages/BillImportPage'
import ServicesPage from './pages/ServicesPage'
import PackagesPage from './pages/PackagesPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import StockTransfersPage from './pages/StockTransfersPage'
import ReportsPage from './pages/ReportsPage'
import BranchesPage from './pages/BranchesPage'
import StaffPage from './pages/StaffPage'
import SettingsPage from './pages/SettingsPage'
import CashReconciliationPage from './pages/CashReconciliationPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  const getDashboardByRole = () => {
    if (!user) return '/dashboard/owner'
    switch (user.role) {
      case 'owner':
      case 'developer':
        return '/dashboard/owner'
      case 'manager':
        return '/dashboard/manager'
      case 'cashier':
        return '/dashboard/cashier'
      case 'employee':
        return '/dashboard/employee'
      default:
        return '/dashboard/owner'
    }
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getDashboardByRole()} replace /> : <LoginPage />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={getDashboardByRole()} replace />} />

        {/* Dashboards */}
        <Route path="dashboard/owner" element={<OwnerDashboard />} />
        <Route path="dashboard/manager" element={<ManagerDashboard />} />
        <Route path="dashboard/cashier" element={<CashierDashboard />} />
        <Route path="dashboard/employee" element={<EmployeeDashboard />} />

        {/* Main pages */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="bills/new" element={<BillCreatePage />} />
        <Route path="bills/:id" element={<BillDetailPage />} />
        <Route path="bills/import" element={<BillImportPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="packages" element={<PackagesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/transfers" element={<StockTransfersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="cash-reconciliation" element={<CashReconciliationPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
