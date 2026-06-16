import type { AppNotification } from '@/types'

export const notifications: AppNotification[] = [
  {
    id: 'n1',
    kind: 'event',
    title: 'Скоро вебинар',
    text: 'Вебинар «Стратегическое мышление руководителя» начнётся 19 июня в 18:00.',
    date: '2026-06-16T09:00:00',
    read: false,
    href: '/calendar',
  },
  {
    id: 'n2',
    kind: 'course',
    title: 'Новый модуль доступен',
    text: 'В курсе «Стратегическое лидерство» открыт модуль 3 «Масштаб влияния».',
    date: '2026-06-15T14:20:00',
    read: false,
    href: '/courses/strategic-leadership',
  },
  {
    id: 'n3',
    kind: 'survey',
    title: 'Пройдите опрос',
    text: 'Поделитесь обратной связью по курсу «Стратегическое лидерство».',
    date: '2026-06-14T10:05:00',
    read: false,
    href: '/surveys/course-feedback',
  },
  {
    id: 'n4',
    kind: 'forum',
    title: 'Ответ в вашей теме',
    text: 'Дмитрий Воронов ответил в теме «Как выбрать стратегию роста?».',
    date: '2026-06-13T16:40:00',
    read: true,
    href: '/forum/growth-strategy',
  },
  {
    id: 'n5',
    kind: 'system',
    title: 'Платформа обновлена',
    text: 'Добавлен новый прогресс-трекер и центр уведомлений.',
    date: '2026-06-12T08:00:00',
    read: true,
    href: '/news/platform-update',
  },
]
