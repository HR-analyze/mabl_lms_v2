import { NavLink } from 'react-router-dom'
import { Logo } from '../brand/Logo'
import {
  Book,
  Calendar,
  Chat,
  Clipboard,
  Document,
  Grid,
  Home,
  Newspaper,
  Bell,
} from '../ui/Icon'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/dashboard', label: 'Кабинет', icon: Home },
  { to: '/courses', label: 'Курсы', icon: Grid },
  { to: '/materials', label: 'Материалы', icon: Document },
  { to: '/calendar', label: 'Календарь', icon: Calendar },
  { to: '/surveys', label: 'Опросники', icon: Clipboard },
  { to: '/news', label: 'Новости', icon: Newspaper },
  { to: '/forum', label: 'Форум', icon: Chat },
  { to: '/notifications', label: 'Уведомления', icon: Bell },
]

interface SidebarProps {
  onNavigate?: () => void
}

/** Боковая навигация личного кабинета (фон — Нефть). */
export function Sidebar({ onNavigate }: SidebarProps) {
  const { isAdmin } = useAuth()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-token px-3 py-2.5 text-sm transition-colors',
      isActive ? 'bg-wisdom/10 text-wisdom' : 'text-wisdom/55 hover:bg-wisdom/5 hover:text-wisdom',
    )

  return (
    <div className="flex h-full flex-col bg-neft text-wisdom">
      <div className="flex h-20 items-center px-6">
        <Logo onDark />
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onNavigate}
            className={linkClass}
          >
            <Icon width={18} height={18} />
            <span className="uppercase tracking-wide text-[0.78rem]">{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <div className="pt-4">
            <p className="px-3 pb-2 text-[0.62rem] uppercase tracking-wide text-wisdom/35">
              Администрирование
            </p>
            <NavLink to="/admin" onClick={onNavigate} className={linkClass}>
              <Grid width={18} height={18} />
              <span className="uppercase tracking-wide text-[0.78rem]">Программы</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="border-t border-wisdom/10 px-6 py-5">
        <p className="flex items-center gap-2 text-[0.68rem] uppercase tracking-wide text-wisdom/40">
          <Book width={14} height={14} /> Sapere · Ducere
        </p>
      </div>
    </div>
  )
}
