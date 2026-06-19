import type { Order } from '@/types'
import { orders as seedOrders } from '@/data/orders'
import { USE_MOCK, http, mockDelay } from './config'
import { makeStore, uniqueId } from './_store'

/**
 * Ресурс «Заказы» для админ-панели.
 * mock-реализация хранит данные в localStorage; http-реализация ходит на бэкенд.
 */

const store = makeStore<Order>('mabl.admin.orders.v1', seedOrders)

/** Генерация следующего человекочитаемого номера заказа (ORD-####). */
function nextOrderId(list: Order[]): string {
  const maxNum = list.reduce((max, o) => {
    const n = Number(o.id.replace(/\D/g, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 1042)
  return uniqueId(`ORD-${maxNum + 1}`, new Set(list.map((o) => o.id)))
}

export const ordersApi = {
  async list(): Promise<Order[]> {
    if (!USE_MOCK) return http<Order[]>('/admin/orders')
    await mockDelay()
    return store.read()
  },

  async get(id: string): Promise<Order | undefined> {
    if (!USE_MOCK) return http<Order>(`/admin/orders/${id}`)
    await mockDelay()
    return store.read().find((o) => o.id === id)
  },

  async create(order: Order): Promise<Order> {
    if (!USE_MOCK)
      return http<Order>('/admin/orders', { method: 'POST', body: JSON.stringify(order) })
    await mockDelay()
    const list = store.read()
    const id = order.id?.trim() || nextOrderId(list)
    const created: Order = { ...order, id }
    store.write([created, ...list])
    return created
  },

  async update(id: string, patch: Partial<Order>): Promise<Order> {
    if (!USE_MOCK)
      return http<Order>(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    await mockDelay()
    const list = store.read()
    const next = list.map((o) => (o.id === id ? { ...o, ...patch, id } : o))
    store.write(next)
    return next.find((o) => o.id === id) as Order
  },

  async remove(id: string): Promise<void> {
    if (!USE_MOCK) return http<void>(`/admin/orders/${id}`, { method: 'DELETE' })
    await mockDelay()
    store.write(store.read().filter((o) => o.id !== id))
  },

  /** Сброс к исходным демо-данным (только mock). */
  async reset(): Promise<Order[]> {
    if (!USE_MOCK) return http<Order[]>('/admin/orders/reset', { method: 'POST' })
    await mockDelay()
    return store.reset()
  },
}
