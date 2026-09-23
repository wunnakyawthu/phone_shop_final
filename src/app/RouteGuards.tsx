import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../components/feedback/Feedback'
import { useAuth } from '../features/auth/AuthProvider'
import type { AppRole } from '../types/app'

export function ProtectedRoute() {
  const { session, profile, isLoading, error } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()
  if (isLoading) return <LoadingState />
  if (!session || !profile)
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  if (error)
    return (
      <main className="grid min-h-svh place-items-center p-4">
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{t(error)}</p>
      </main>
    )
  return <Outlet />
}

export function RoleRoute({ roles }: { roles: AppRole[] }) {
  const { profile } = useAuth()
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/app" replace />
  return <Outlet />
}
