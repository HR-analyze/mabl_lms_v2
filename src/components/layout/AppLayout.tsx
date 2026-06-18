import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppShell } from './AppShell'
import { useAuth } from '@/context/AuthContext'

/**
 * Каркас личного кабинета (дашборд, уведомления, админка).
 * Защищённая зона — без авторизации редирект на /login.
 */
export function AppLayout() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <AppShell>
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </div>
    </AppShell>
  )
}
