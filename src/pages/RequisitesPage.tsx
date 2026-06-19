/** Страница реквизитов организации (обязательна для образовательной платформы). */
export default function RequisitesPage() {
  const rows: [string, string][] = [
    ['Полное наименование', 'Общество с ограниченной ответственностью «Международная Академия Бизнес Лидерства»'],
    ['Сокращённое наименование', 'ООО «Международная Академия Бизнес Лидерства»'],
    ['Адрес места нахождения', '109316, г. Москва, вн.тер.г. муниципальный округ Южнопортовый, пр-кт Волгоградский, д. 26, стр. 1'],
    ['Фактический адрес', '109316, г. Москва, вн.тер.г. муниципальный округ Южнопортовый, пр-кт Волгоградский, д. 26, стр. 1'],
    ['E-mail', 'biznes-liderstva@yandex.ru'],
    ['Телефон', '+7 (985) 183-08-08'],
    ['ОГРН', '1267700127001'],
    ['ИНН', '9722114606'],
    ['КПП', '772201001'],
    ['Расчётный счёт', '40702810701300056414'],
    ['Банк', 'АО «АЛЬФА-БАНК»'],
    ['Корреспондентский счёт', '30101810200000000593'],
    ['БИК', '044525593'],
    ['ОКПО', '48188042'],
    ['ОКВЭД', '85.42'],
    ['ОКАТО', '45290594000'],
    ['ОКТМО', '45396000000'],
    ['Генеральный директор', 'Горностаева Екатерина Евгеньевна'],
  ]

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-10">
      <p className="eyebrow mb-4">Реквизиты</p>
      <h1 className="font-serif text-3xl text-neft">Реквизиты организации</h1>
      <p className="mt-4 text-ink-60">
        ООО «Международная Академия Бизнес Лидерства» — правообладатель образовательной платформы course.mabl.ru.
      </p>

      <div className="mt-10 overflow-hidden rounded-card border border-ink-10">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-ink-10">
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="w-1/3 bg-ink-5 px-4 py-3 align-top text-ink-60">{k}</td>
                <td className="px-4 py-3 text-neft">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <a
          href="/docs/rekvizity-mabl.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-token bg-ocean px-5 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-wisdom transition-colors hover:bg-oceanc-80"
        >
          Скачать карточку организации (PDF)
        </a>
      </div>
    </div>
  )
}
