import type { CalendarEvent } from '@/types'
import { events as seedEvents } from '@/data/events'
import { USE_MOCK, http, mockDelay } from './config'
import { makeStore, slugify, uniqueId } from './_store'

/**
 * Ресурс «События» (вебинары, мероприятия, дедлайны). Источник истины для
 * календаря, главной и админ-панели.
 * mock-реализация хранит данные в localStorage; http-реализация ходит на бэкенд.
 */

const store = makeStore<CalendarEvent>('mabl.events.v1', seedEvents)

/** Ближайший предстоящий вебинар из списка (или undefined, если их нет). */
function nextWebinar(list: CalendarEvent[]): CalendarEvent | undefined {
  return list
    .filter((e) => e.type === 'Вебинар')
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0]
}

export const eventsApi = {
  async list(): Promise<CalendarEvent[]> {
    if (!USE_MOCK) return http<CalendarEvent[]>('/events')
    await mockDelay()
    return store.read()
  },

  async get(id: string): Promise<CalendarEvent | undefined> {
    if (!USE_MOCK) return http<CalendarEvent>(`/events/${id}`)
    await mockDelay()
    return store.read().find((e) => e.id === id)
  },

  /** Ближайший вебинар для главной страницы (может отсутствовать). */
  async next(): Promise<CalendarEvent | undefined> {
    if (!USE_MOCK) return http<CalendarEvent | undefined>('/events/next')
    await mockDelay()
    return nextWebinar(store.read())
  },

  async create(event: CalendarEvent): Promise<CalendarEvent> {
    if (!USE_MOCK)
      return http<CalendarEvent>('/events', { method: 'POST', body: JSON.stringify(event) })
    await mockDelay()
    const list = store.read()
    const id = uniqueId(event.id?.trim() || slugify(event.title, 'event'), new Set(list.map((e) => e.id)))
    const created: CalendarEvent = { ...event, id }
    store.write([...list, created])
    return created
  },

  async update(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
    if (!USE_MOCK)
      return http<CalendarEvent>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    await mockDelay()
    const list = store.read()
    const next = list.map((e) => (e.id === id ? { ...e, ...patch, id } : e))
    store.write(next)
    return next.find((e) => e.id === id) as CalendarEvent
  },

  async remove(id: string): Promise<void> {
    if (!USE_MOCK) return http<void>(`/events/${id}`, { method: 'DELETE' })
    await mockDelay()
    store.write(store.read().filter((e) => e.id !== id))
  },

  /** Сброс к исходным демо-данным (только mock). */
  async reset(): Promise<CalendarEvent[]> {
    if (!USE_MOCK) return http<CalendarEvent[]>('/events/reset', { method: 'POST' })
    await mockDelay()
    return store.reset()
  },
}
