import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * Защита админ-зоны: доступ только для пользователей с ролью «admin».
 * Аутентификация уже гарантируется внешним AppLayout, здесь — только роль.
 */
export function AdminGuard() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />
}
