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
  {
    title: 'Документы',
    links: [
      { to: '/documents', label: 'Все документы' },
      { to: '/requisites', label: 'Реквизиты' },
      { to: '/offer', label: 'Публичная оферта' },
    ],
  },
]

/** Ссылки правового блока (мелким шрифтом внизу футера). */
const legalLinks = [
  { to: '/requisites', label: 'Реквизиты' },
  { to: '/offer', label: 'Публичная оферта' },
  { to: '/privacy', label: 'Политика конфиденциальности' },
  { to: '/terms', label: 'Правила платформы' },
  { to: '/consent-personal-data', label: 'Согласие на обработку ПДн' },
  { to: '/consent-marketing', label: 'Согласие на рассылки' },
]

export function Footer() {
  return (
    <footer className="border-t border-ink-10 bg-neft text-wisdom">
      <div className="mx-auto max-w-content px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo onDark />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-wisdom/60">
              Международная академия бизнес лидерства. Sapere · Ducere — Знать, чтобы лидировать.
            </p>
            <div className="mt-6 space-y-2 text-[0.78rem] text-wisdom/50">
              <p>
                <a href="tel:+79851830808" className="transition-colors hover:text-wisdom">
                  +7 (985) 183-08-08
                </a>
              </p>
              <p>
                <a href="mailto:biznes-liderstva@yandex.ru" className="transition-colors hover:text-wisdom">
                  biznes-liderstva@yandex.ru
                </a>
              </p>
              <p className="leading-snug">109316, г. Москва,<br />пр-кт Волгоградский, д. 26, стр. 1</p>
            </div>
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

        {/* Правовой блок — мелким шрифтом */}
        <div className="mt-14 border-t border-wisdom/10 pt-6">
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-[0.66rem] text-wisdom/35">
            {legalLinks.map((l) => (
              <Link key={l.to} to={l.to} className="transition-colors hover:text-wisdom/70">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 text-[0.66rem] text-wisdom/35 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} ООО «Международная Академия Бизнес Лидерства» · ОГРН&nbsp;1267700127001 · ИНН&nbsp;9722114606</p>
            <p className="uppercase tracking-wide">Sapere · Ducere</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
