import type { AdminUser, AdminUserStatus } from '@/types'
import { adminUsers } from '@/data/users'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «Участники» для админ-панели. */
export const usersApi = {
  async list(): Promise<AdminUser[]> {
    if (!USE_MOCK) return http<AdminUser[]>('/admin/users')
    await mockDelay()
    return adminUsers
  },

  async get(id: string): Promise<AdminUser | undefined> {
    if (!USE_MOCK) return http<AdminUser>(`/admin/users/${id}`)
    await mockDelay()
    return adminUsers.find((u) => u.id === id)
  },

  async setStatus(id: string, status: AdminUserStatus): Promise<AdminUser> {
    if (!USE_MOCK)
      return http<AdminUser>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    await mockDelay()
    const user = adminUsers.find((u) => u.id === id)
    if (!user) throw new Error('Участник не найден')
    return { ...user, status }
  },
}
