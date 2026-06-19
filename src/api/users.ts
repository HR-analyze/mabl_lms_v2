import type { AdminUser, AdminUserStatus } from '@/types'
import { adminUsers as seedUsers } from '@/data/users'
import { USE_MOCK, http, mockDelay } from './config'
import { makeStore, uniqueId } from './_store'

/**
 * Ресурс «Участники» для админ-панели.
 * mock-реализация хранит данные в localStorage; http-реализация ходит на бэкенд.
 */

const store = makeStore<AdminUser>('mabl.admin.users.v1', seedUsers)

export const usersApi = {
  async list(): Promise<AdminUser[]> {
    if (!USE_MOCK) return http<AdminUser[]>('/admin/users')
    await mockDelay()
    return store.read()
  },

  async get(id: string): Promise<AdminUser | undefined> {
    if (!USE_MOCK) return http<AdminUser>(`/admin/users/${id}`)
    await mockDelay()
    return store.read().find((u) => u.id === id)
  },

  async setStatus(id: string, status: AdminUserStatus): Promise<AdminUser> {
    if (!USE_MOCK)
      return http<AdminUser>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    await mockDelay()
    const list = store.read()
    const next = list.map((u) => (u.id === id ? { ...u, status } : u))
    store.write(next)
    const user = next.find((u) => u.id === id)
    if (!user) throw new Error('Участник не найден')
    return user
  },

  async create(user: AdminUser): Promise<AdminUser> {
    if (!USE_MOCK)
      return http<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(user) })
    await mockDelay()
    const list = store.read()
    const id = uniqueId(user.id?.trim() || `u-${Date.now()}`, new Set(list.map((u) => u.id)))
    const created: AdminUser = { ...user, id }
    store.write([created, ...list])
    return created
  },

  async update(id: string, patch: Partial<AdminUser>): Promise<AdminUser> {
    if (!USE_MOCK)
      return http<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    await mockDelay()
    const list = store.read()
    const next = list.map((u) => (u.id === id ? { ...u, ...patch, id } : u))
    store.write(next)
    return next.find((u) => u.id === id) as AdminUser
  },

  async remove(id: string): Promise<void> {
    if (!USE_MOCK) return http<void>(`/admin/users/${id}`, { method: 'DELETE' })
    await mockDelay()
    store.write(store.read().filter((u) => u.id !== id))
  },

  /** Сброс к исходным демо-данным (только mock). */
  async reset(): Promise<AdminUser[]> {
    if (!USE_MOCK) return http<AdminUser[]>('/admin/users/reset', { method: 'POST' })
    await mockDelay()
    return store.reset()
  },
}
