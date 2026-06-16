import type { CalendarEvent } from '@/types'
import { events, getNextWebinar } from '@/data/events'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «События» (вебинары, мероприятия, дедлайны). */
export const eventsApi = {
  async list(): Promise<CalendarEvent[]> {
    if (!USE_MOCK) return http<CalendarEvent[]>('/events')
    await mockDelay()
    return events
  },
  async get(id: string): Promise<CalendarEvent | undefined> {
    if (!USE_MOCK) return http<CalendarEvent>(`/events/${id}`)
    await mockDelay()
    return events.find((e) => e.id === id)
  },
  /** Ближайший вебинар для главной страницы. */
  async next(): Promise<CalendarEvent> {
    if (!USE_MOCK) return http<CalendarEvent>('/events/next')
    await mockDelay()
    return getNextWebinar()
  },
}
