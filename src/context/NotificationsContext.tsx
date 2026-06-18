import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/api'
import type { AppNotification } from '@/types'

/** Состояние уведомлений с отметкой о прочтении (общее для ЛК). */

interface NotificationsContextValue {
  items: AppNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(() => {
    let active = true
    api.notifications.list().then((list) => active && setItems(list))
    return () => {
      active = false
    }
  }, [])

  const markRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })))

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unreadCount: items.filter((n) => !n.read).length,
      markRead,
      markAllRead,
    }),
    [items],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications должен использоваться внутри NotificationsProvider')
  return ctx
}
