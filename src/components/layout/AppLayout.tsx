import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Bell, Close, Logout, Menu, User } from '../ui/Icon'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationsContext'
import { cn } from '@/lib/utils'

/**
 * Каркас личного кабинета: боковая навигация + верхняя панель.
 * Защищённая зона — без авторизации редирект на /login.
 */
export function AppLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="min-h-screen bg-ink-5">
      {/* Десктоп-сайдбар */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Мобильный сайдбар */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-neft/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Верхняя панель */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-10 bg-wisdom px-5 md:px-8">
          <button
            className="inline-flex h-10 w-10 items-center justify-center text-neft lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Меню"
          >
            {mobileOpen ? <Close /> : <Menu />}
          </button>

          <div className="ml-auto flex items-center gap-2 md:gap-4">
            <Link
              to="/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-token text-ink-60 hover:bg-ink-5 hover:text-neft"
              aria-label="Уведомления"
            >
              <Bell />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ocean px-1 text-[0.6rem] font-semibold text-wisdom">
                  {unreadCount}
                </span>
              )}
            </Link>

            <div className="hidden items-center gap-3 border-l border-ink-10 pl-4 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neft text-wisdom">
                <User width={18} height={18} />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium text-neft">{user?.name}</p>
                <p className="text-[0.7rem] text-ink-60">{user?.role}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-token text-ink-60 hover:bg-ink-5 hover:text-neft"
              aria-label="Выйти"
              title="Выйти"
            >
              <Logout />
            </button>
          </div>
        </header>

        <main className={cn('px-5 py-8 md:px-8 md:py-10')}>
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
