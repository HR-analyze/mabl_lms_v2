import { Outlet } from 'react-router-dom'
import { AppShell } from './AppShell'
import { Header } from './Header'
import { Footer } from './Footer'
import { useAuth } from '@/context/AuthContext'

/**
 * Адаптивный каркас для общих контентных разделов (курсы, материалы,
 * календарь, новости, форум, опросники).
 *
 * Авторизованный пользователь видит их внутри кабинета (тот же сайдбар),
 * чтобы навигация была единообразной и его «не выбрасывало» на публичный сайт.
 * Гость видит привычную публичную шапку и подвал.
 */
export function ContentLayout() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <AppShell surfaceClassName="bg-wisdom">
        <Outlet />
      </AppShell>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-wisdom">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
