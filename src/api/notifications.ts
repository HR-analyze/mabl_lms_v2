import type { AppNotification } from '@/types'
import { notifications } from '@/data/notifications'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «Уведомления». */
export const notificationsApi = {
  async list(): Promise<AppNotification[]> {
    if (!USE_MOCK) return http<AppNotification[]>('/notifications')
    await mockDelay()
    return notifications
  },
}
