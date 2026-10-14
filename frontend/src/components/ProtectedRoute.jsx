import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

/**
 * Gate for pages that need a logged-in customer.
 * While the first /customers/me check is in flight we render a loader —
 * redirecting immediately would kick a logged-in user out on every refresh.
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loader label="Checking your session…" />

  if (!user) {
    // `state` lets the login page send the customer back where they were headed.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
