import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Logo } from '../brand/Logo'
import { Button } from '../ui/Button'
import { Close, Menu } from '../ui/Icon'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const publicNav = [
  { to: '/courses', label: 'Курсы' },
  { to: '/news', label: 'Новости' },
  { to: '/calendar', label: 'Календарь' },
  { to: '/forum', label: 'Форум' },
]

/** Шапка публичной части сайта. */
export function Header() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-ink-10 bg-wisdom/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-content items-center justify-between px-6 md:px-10">
        <Logo />

        <nav className="hidden items-center gap-9 lg:flex">
          {publicNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'text-[0.78rem] uppercase tracking-wide transition-colors',
                  isActive ? 'text-ocean' : 'text-ink-60 hover:text-neft',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <Button to="/dashboard" variant="dark" size="sm">
              Личный кабинет
            </Button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[0.78rem] uppercase tracking-wide text-ink-60 transition-colors hover:text-neft"
              >
                Войти
              </Link>
              <Button to="/courses" size="sm">
                Поступить
              </Button>
            </>
          )}
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center text-neft lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
        >
          {open ? <Close /> : <Menu />}
        </button>
      </div>

      {/* Мобильное меню */}
      {open && (
        <div className="border-t border-ink-10 bg-wisdom lg:hidden">
          <nav className="mx-auto flex max-w-content flex-col px-6 py-4">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-ink-10 py-3 text-sm uppercase tracking-wide text-ink-80"
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-4 flex gap-3">
              {isAuthenticated ? (
                <Button to="/dashboard" variant="dark" size="sm" fullWidth>
                  Личный кабинет
                </Button>
              ) : (
                <>
                  <Button to="/login" variant="secondary" size="sm" fullWidth>
                    Войти
                  </Button>
                  <Button to="/courses" size="sm" fullWidth>
                    Поступить
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
