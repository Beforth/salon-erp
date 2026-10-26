import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import SimpleDashboard from '@/components/dashboard/SimpleDashboard'

function ManagerDashboard() {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !['manager', 'developer'].includes(user.role)) {
      if (['owner'].includes(user.role)) navigate('/dashboard/owner', { replace: true })
      else if (user.role === 'employee') navigate('/dashboard/employee', { replace: true })
      else if (user.role === 'cashier') navigate('/dashboard/cashier', { replace: true })
    }
  }, [user, navigate])

  return <SimpleDashboard fallbackName="Manager" />
}

export default ManagerDashboard
