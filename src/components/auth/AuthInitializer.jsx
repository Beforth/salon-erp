import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getCurrentUser } from '@/store/slices/authSlice'
import { getStoredToken } from '@/services/api'

/**
 * Validates stored session on load. Clears stale auth if /auth/me fails
 * (e.g. after DB restore or JWT secret change).
 */
export default function AuthInitializer({ children }) {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    if (!isAuthenticated || !getStoredToken('accessToken')) return
    dispatch(getCurrentUser())
  }, [dispatch, isAuthenticated])

  return children
}
