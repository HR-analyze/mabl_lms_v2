import type { CalendarEvent } from '@/types'
import { events } from '@/data/events'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «События» (вебинары, мероприятия, дедлайны). */
export const eventsApi = {
  async list(): Promise<CalendarEvent[]> {
    if (!USE_MOCK) return http<CalendarEvent[]>('/events')
    await mockDelay()
    return events
  },
}
