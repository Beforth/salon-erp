import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

/** Renders children only for the given roles; everyone else goes back to their own dashboard. */
function RoleRoute({ roles, children }) {
  const { user } = useSelector((state) => state.auth)
  if (user && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default RoleRoute
