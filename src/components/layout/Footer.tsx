import { Link } from 'react-router-dom'
import { Logo } from '../brand/Logo'

const columns = [
  {
    title: 'Обучение',
    links: [
      { to: '/courses', label: 'Каталог курсов' },
      { to: '/calendar', label: 'Вебинары' },
      { to: '/materials', label: 'Материалы' },
    ],
  },
  {
    title: 'Сообщество',
    links: [
      { to: '/news', label: 'Новости' },
      { to: '/forum', label: 'Форум' },
      { to: '/dashboard', label: 'Личный кабинет' },
    ],
  },
  {
    title: 'Академия',
    links: [
      { to: '/', label: 'О МАБЛ' },
      { to: '/login', label: 'Вход для слушателей' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-ink-10 bg-neft text-wisdom">
      <div className="mx-auto max-w-content px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo onDark />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-wisdom/60">
              Международная академия бизнес лидерства. Sapere · Ducere — Знать, чтобы лидировать.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-[0.7rem] uppercase tracking-wide text-wisdom/40">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link to={link.to} className="text-sm text-wisdom/75 transition-colors hover:text-wisdom">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-wisdom/10 pt-6 text-[0.72rem] text-wisdom/40 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} МАБЛ · Международная академия бизнес лидерства</p>
          <p className="uppercase tracking-wide">Sapere · Ducere</p>
        </div>
      </div>
    </footer>
  )
}
