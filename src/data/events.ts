import type { CalendarEvent } from '@/types'

/**
 * События академии: вебинары, дедлайны и мероприятия.
 *
 * Демо-заглушки убраны: события и вебинары создаются из админ-панели
 * (раздел «События»), данные хранятся в localStorage (mock-режим).
 */
export const events: CalendarEvent[] = []

export const getEventById = (id: string): CalendarEvent | undefined =>
  events.find((e) => e.id === id)

/** Ближайшее регистрируемое событие (для главной страницы), если есть. */
export const getNextWebinar = (): CalendarEvent | undefined =>
  events
    .filter((e) => e.type === 'Вебинар')
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0]
