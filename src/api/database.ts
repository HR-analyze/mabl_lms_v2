import { http, USE_MOCK, mockDelay } from './config'

/**
 * Ресурс «Управление базой данных» для админ-панели.
 * Работает только в http-режиме (реальная БД Neon). В mock-режиме возвращает
 * демонстрационные данные, чтобы интерфейс не падал.
 */

export interface DbTable {
  name: string
  label: string
  rows: number
}

export interface DbUser {
  id: string
  name: string
  email: string
  role: string
  kind: 'admin' | 'student'
  createdAt?: string
}

export interface DbStatus {
  tables: DbTable[]
  users: DbUser[]
}

export interface NewDbUser {
  name: string
  email: string
  role?: string
  kind: 'admin' | 'student'
  password: string
}

export interface DbUserPatch {
  name?: string
  role?: string
  kind?: 'admin' | 'student'
  password?: string
}

const mockStatus: DbStatus = {
  tables: [
    { name: 'courses', label: 'Программы', rows: 7 },
    { name: 'users', label: 'Аккаунты', rows: 2 },
  ],
  users: [
    { id: 'u-001', name: 'Александр Орлов', email: 'demo@mabl.ru', role: 'Слушатель академии', kind: 'student' },
    { id: 'u-adm', name: 'Администратор', email: 'admin@mabl.ru', role: 'Администратор платформы', kind: 'admin' },
  ],
}

export const databaseApi = {
  async status(): Promise<DbStatus> {
    if (USE_MOCK) {
      await mockDelay()
      return mockStatus
    }
    return http<DbStatus>('/admin/db')
  },

  async init(): Promise<{ ok: boolean; counts: { courses: number; users: number } }> {
    if (USE_MOCK) {
      await mockDelay()
      return { ok: true, counts: { courses: 7, users: 2 } }
    }
    return http('/admin/db/init', { method: 'POST' })
  },

  async resetCourses(): Promise<unknown> {
    if (USE_MOCK) {
      await mockDelay()
      return []
    }
    return http('/admin/db/reset-courses', { method: 'POST' })
  },

  async createUser(user: NewDbUser): Promise<DbUser> {
    if (USE_MOCK) {
      await mockDelay()
      return { id: `u-${Date.now()}`, ...user, role: user.role ?? '' }
    }
    return http<DbUser>('/admin/db/users', { method: 'POST', body: JSON.stringify(user) })
  },

  async updateUser(id: string, patch: DbUserPatch): Promise<DbUser> {
    if (USE_MOCK) {
      await mockDelay()
      const u = mockStatus.users.find((x) => x.id === id)!
      return { ...u, ...patch } as DbUser
    }
    return http<DbUser>(`/admin/db/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
  },

  async deleteUser(id: string): Promise<void> {
    if (USE_MOCK) {
      await mockDelay()
      return
    }
    await http(`/admin/db/users/${id}`, { method: 'DELETE' })
  },
}
