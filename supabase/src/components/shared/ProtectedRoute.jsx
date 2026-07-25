import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Spinner from '@/components/ui/Spinner'
import AccessDenied from './AccessDenied'

export default function ProtectedRoute({ roles, permission, children }) {
  const { loading, isAuthenticated, role, can, error } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner full label="Inathibitisha..." />

  if (!isAuthenticated) {
    return <Navigate to="/ingia" state={{ from: location, error }} replace />
  }

  if (roles && !roles.includes(role)) return <AccessDenied />
  if (permission && !can(permission)) return <AccessDenied />

  return children
}
