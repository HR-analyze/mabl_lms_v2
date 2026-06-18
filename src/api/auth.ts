import type { User } from '@/types'
import { ApiError, USE_MOCK, http, mockDelay } from './config'

/**
 * Ресурс «Аутентификация». mock-режим валидирует демо-аккаунты локально;
 * http-режим обращается к реальному бэкенду (/auth/login, /auth/recover).
 */

/** Демо-аккаунт: учётные данные + связанный профиль. */
export interface DemoAccount {
  email: string
  password: string
  /** Короткая подпись для экрана входа. */
  label: string
  user: User
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'demo@mabl.ru',
    password: 'mabl2026',
    label: 'Слушатель',
    user: {
      id: 'u-001',
      name: 'Александр Орлов',
      email: 'demo@mabl.ru',
      role: 'Слушатель академии',
      kind: 'student',
    },
  },
  {
    email: 'admin@mabl.ru',
    password: 'admin2026',
    label: 'Администратор',
    user: {
      id: 'u-adm',
      name: 'Елена Северова',
      email: 'admin@mabl.ru',
      role: 'Администратор платформы',
      kind: 'admin',
    },
  },
]

export const authApi = {
  /** Демо-аккаунты для экрана входа (в http-режиме список пуст). */
  demoAccounts(): DemoAccount[] {
    return USE_MOCK ? DEMO_ACCOUNTS : []
  },

  async login(email: string, password: string): Promise<User> {
    if (!USE_MOCK) {
      return http<User>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    }
    await mockDelay(500)
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password,
    )
    if (!account) {
      throw new ApiError('Неверный e-mail или пароль. Проверьте данные и попробуйте снова.', 401)
    }
    return account.user
  },

  async recover(email: string): Promise<string> {
    if (!USE_MOCK) {
      return http<{ message: string }>('/auth/recover', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }).then((r) => r.message)
    }
    await mockDelay(500)
    if (!email.includes('@')) {
      throw new ApiError('Укажите корректный e-mail.', 400)
    }
    return `Инструкция по восстановлению доступа отправлена на ${email}.`
  },
}
