import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/types'
import { delay } from '@/lib/utils'

/**
 * Mock-авторизация. Состояние хранится в localStorage, чтобы вход
 * сохранялся между перезагрузками. В продакшене заменяется на реальный
 * провайдер (JWT/сессии): см. README → «Что подключить для production».
 */

/** Демо-аккаунт: учётные данные + связанный профиль пользователя. */
interface DemoAccount {
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

const STORAGE_KEY = 'mabl.auth.user'

/** Совместимость со старыми профилями в localStorage (без поля kind). */
function normalizeUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null
  const u = raw as Partial<User>
  if (!u.id || !u.email) return null
  return {
    id: u.id,
    name: u.name ?? '',
    email: u.email,
    role: u.role ?? 'Слушатель академии',
    kind: u.kind === 'admin' ? 'admin' : 'student',
  }
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  recover: (email: string) => Promise<string>
  /** Демо-аккаунты для быстрого входа на экране авторизации. */
  demoAccounts: DemoAccount[]
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? normalizeUser(JSON.parse(raw)) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user])

  const login = async (email: string, password: string) => {
    await delay(600)
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password,
    )
    if (!account) {
      throw new Error('Неверный e-mail или пароль. Проверьте данные и попробуйте снова.')
    }
    setUser(account.user)
    return account.user
  }

  const logout = () => setUser(null)

  const recover = async (email: string) => {
    await delay(600)
    if (!email.includes('@')) {
      throw new Error('Укажите корректный e-mail.')
    }
    // Mock: «письмо отправлено»
    return `Инструкция по восстановлению доступа отправлена на ${email}.`
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.kind === 'admin',
      login,
      logout,
      recover,
      demoAccounts: DEMO_ACCOUNTS,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider')
  return ctx
}
