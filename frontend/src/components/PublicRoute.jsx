import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

/**
 * The mirror of ProtectedRoute: someone who is already logged in has no
 * business on /login or /register, so send them to the home page.
 */
export default function PublicRoute() {
  const { user, loading } = useAuth()

  if (loading) return <Loader label="Loading…" />

  if (user) return <Navigate to="/home" replace />

  return <Outlet />
}
