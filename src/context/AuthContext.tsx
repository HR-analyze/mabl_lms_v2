import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/types'
import { delay } from '@/lib/utils'

/**
 * Mock-авторизация. Состояние хранится в localStorage, чтобы вход
 * сохранялся между перезагрузками. В продакшене заменяется на реальный
 * провайдер (JWT/сессии): см. README → «Что подключить для production».
 */

const DEMO_USER: User = {
  id: 'u-001',
  name: 'Александр Орлов',
  email: 'demo@mabl.ru',
  role: 'Слушатель академии',
}

const DEMO_CREDENTIALS = { email: 'demo@mabl.ru', password: 'mabl2026' }

const STORAGE_KEY = 'mabl.auth.user'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  recover: (email: string) => Promise<string>
  demoCredentials: typeof DEMO_CREDENTIALS
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as User) : null
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
    const matches =
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password
    if (!matches) {
      throw new Error('Неверный e-mail или пароль. Проверьте данные и попробуйте снова.')
    }
    setUser(DEMO_USER)
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
      login,
      logout,
      recover,
      demoCredentials: DEMO_CREDENTIALS,
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
