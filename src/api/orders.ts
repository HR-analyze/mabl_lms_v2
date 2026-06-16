import type { Order } from '@/types'
import { orders } from '@/data/orders'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «Заказы» для админ-панели. */
export const ordersApi = {
  async list(): Promise<Order[]> {
    if (!USE_MOCK) return http<Order[]>('/admin/orders')
    await mockDelay()
    return orders
  },
}
