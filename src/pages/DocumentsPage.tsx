import { Link } from 'react-router-dom'
import { ArrowRight, Document } from '@/components/ui/Icon'

const docs = [
  {
    to: '/requisites',
    pdf: '/docs/rekvizity-mabl.pdf',
    title: 'Карточка организации (реквизиты)',
    desc: 'Полное наименование, ИНН, ОГРН, банковские реквизиты ООО «МАБЛ».',
  },
  {
    to: '/terms',
    pdf: '/docs/pravila-polzovaniya.pdf',
    title: 'Правила пользования платформой',
    desc: 'Условия использования образовательной платформы course.mabl.ru.',
  },
  {
    to: '/offer',
    pdf: '/docs/publichnaya-oferta.pdf',
    title: 'Публичная оферта',
    desc: 'Договор на оказание образовательных и информационно-консультационных услуг.',
  },
  {
    to: '/privacy',
    pdf: '/docs/politika-konfidencialnosti.pdf',
    title: 'Политика конфиденциальности',
    desc: 'Порядок обработки и защиты персональных данных пользователей.',
  },
  {
    to: '/consent-personal-data',
    pdf: '/docs/soglasie-personalnye-dannye.pdf',
    title: 'Согласие на обработку персональных данных',
    desc: 'Условия предоставления согласия на обработку персональных данных.',
  },
  {
    to: '/consent-marketing',
    pdf: '/docs/soglasie-rassylki.pdf',
    title: 'Согласие на рекламно-информационные рассылки',
    desc: 'Условия получения рекламных, информационных и сервисных сообщений.',
  },
]

/** Раздел «Документы»: перечень всех правовых документов платформы. */
export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-10">
      <p className="eyebrow mb-4">Правовая информация</p>
      <h1 className="font-serif text-3xl text-neft">Документы</h1>
      <p className="mt-4 max-w-2xl text-ink-60">
        Комплект обязательных документов образовательной платформы ООО «МАБЛ». Каждый документ можно
        открыть на сайте или скачать в формате PDF.
      </p>

      <ul className="mt-10 space-y-3">
        {docs.map((d) => (
          <li key={d.to}>
            <div className="flex items-start gap-4 rounded-card border border-ink-10 p-5 transition-colors hover:border-ink-40">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-neft text-wisdom">
                <Document width={18} height={18} />
              </span>
              <div className="min-w-0 flex-1">
                <Link to={d.to} className="font-serif text-lg text-neft hover:text-ocean">
                  {d.title}
                </Link>
                <p className="mt-1 text-sm text-ink-60">{d.desc}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[0.72rem] uppercase tracking-wide">
                  <Link to={d.to} className="inline-flex items-center gap-1 text-ocean hover:text-oceanc-80">
                    Открыть <ArrowRight width={13} height={13} />
                  </Link>
                  <a
                    href={d.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-50 hover:text-neft"
                  >
                    Скачать PDF
                  </a>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
