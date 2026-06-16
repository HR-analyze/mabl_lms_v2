import type { CalendarEvent } from '@/types'

export const events: CalendarEvent[] = [
  {
    id: 'webinar-strategic-thinking',
    title: 'Вебинар «Стратегическое мышление руководителя»',
    type: 'Вебинар',
    date: '2026-06-19T18:00:00',
    durationMin: 90,
    speaker: 'проф. Анна Корецкая',
    location: 'Онлайн · Zoom',
    description:
      'Открытый вебинар о принятии решений в условиях неопределённости и работе с долгосрочным видением.',
    price: 0,
    registrable: true,
  },
  {
    id: 'webinar-negotiations',
    title: 'Мастер-класс «Переговоры под давлением»',
    type: 'Вебинар',
    date: '2026-06-24T19:00:00',
    durationMin: 120,
    speaker: 'проф. Игорь Мельник',
    location: 'Онлайн · Zoom',
    description: 'Практический мастер-класс по управлению эмоциональным полем переговоров.',
    price: 4900,
    registrable: true,
  },
  {
    id: 'deadline-finance-module',
    title: 'Дедлайн: модуль «Инвестиционные решения»',
    type: 'Дедлайн',
    date: '2026-06-27T23:59:00',
    location: 'Курс «Корпоративные финансы»',
    description: 'Срок сдачи практического задания по второму модулю курса.',
  },
  {
    id: 'leaders-forum',
    title: 'Форум лидеров МАБЛ 2026',
    type: 'Мероприятие',
    date: '2026-07-04T11:00:00',
    durationMin: 360,
    location: 'Москва · Конференц-центр академии',
    description: 'Ежегодная офлайн-встреча сообщества: дискуссии, нетворкинг и вручение сертификатов.',
    price: 9900,
    registrable: true,
  },
  {
    id: 'webinar-digital',
    title: 'Вебинар «Данные как актив компании»',
    type: 'Вебинар',
    date: '2026-07-10T18:30:00',
    durationMin: 75,
    speaker: 'проф. Елена Савина',
    location: 'Онлайн · Zoom',
    description: 'Как превратить данные в управленческий ресурс и выстроить культуру работы с ними.',
    price: 0,
    registrable: true,
  },
  {
    id: 'deadline-leadership-case',
    title: 'Дедлайн: кейс-симулятор по лидерству',
    type: 'Дедлайн',
    date: '2026-07-14T23:59:00',
    location: 'Курс «Стратегическое лидерство»',
    description: 'Завершение интерактивного кейс-симулятора второго модуля.',
  },
]

export const getEventById = (id: string): CalendarEvent | undefined =>
  events.find((e) => e.id === id)

/** Ближайшее регистрируемое событие (для главной страницы) */
export const getNextWebinar = (): CalendarEvent =>
  events
    .filter((e) => e.type === 'Вебинар')
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0]
