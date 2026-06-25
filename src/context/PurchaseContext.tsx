import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getActivePaymentProvider } from '@/lib/payments'
import type { PaymentIntent, PaymentResult, PaymentProvider } from '@/lib/payments'

const paymentProvider = getActivePaymentProvider()

/**
 * Управление доступом: купленные курсы и записи на события.
 * После «оплаты» курс/событие открывается. Состояние персистится локально.
 * Платёж идёт через абстракцию PaymentProvider (см. src/lib/payments.ts).
 */

const OWNED_KEY = 'mabl.owned.courses'
const EVENTS_KEY = 'mabl.registered.events'

// Демо-слушатель уже владеет одним курсом (для наглядного прогресса в ЛК)
const DEFAULT_OWNED = ['strategic-leadership']

interface PurchaseContextValue {
  ownedCourseIds: string[]
  registeredEventIds: string[]
  isOwned: (courseId: string) => boolean
  isRegistered: (eventId: string) => boolean
  /** Выдать доступ к курсу (после подтверждённой оплаты на возврате/webhook). */
  grantCourseAccess: (courseId: string) => void
  /** Провести оплату курса и открыть доступ */
  purchaseCourse: (intent: PaymentIntent) => Promise<PaymentResult>
  /** Записаться на событие (с оплатой, если платное) */
  registerEvent: (eventId: string, intent?: PaymentIntent) => Promise<PaymentResult | void>
  paymentProvider: PaymentProvider
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null)

function loadList(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as string[]) : fallback
  } catch {
    return fallback
  }
}

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [ownedCourseIds, setOwned] = useState<string[]>(() => loadList(OWNED_KEY, DEFAULT_OWNED))
  const [registeredEventIds, setRegistered] = useState<string[]>(() => loadList(EVENTS_KEY, []))

  useEffect(() => {
    localStorage.setItem(OWNED_KEY, JSON.stringify(ownedCourseIds))
  }, [ownedCourseIds])

  useEffect(() => {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(registeredEventIds))
  }, [registeredEventIds])

  const grantCourseAccess = (courseId: string) => {
    setOwned((prev) => (prev.includes(courseId) ? prev : [...prev, courseId]))
  }

  const purchaseCourse = async (intent: PaymentIntent): Promise<PaymentResult> => {
    const result = await paymentProvider.pay(intent)
    // Для redirect-провайдеров (ЮKassa) доступ выдаётся на возврате/по webhook,
    // а не оптимистично здесь — браузер уже уходит на платёжную форму.
    if (result.status === 'succeeded') {
      grantCourseAccess(intent.itemId)
    }
    return result
  }

  const registerEvent = async (eventId: string, intent?: PaymentIntent) => {
    if (intent && intent.amount > 0) {
      const result = await paymentProvider.pay(intent)
      if (result.status === 'succeeded') {
        setRegistered((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]))
      }
      return result
    }
    setRegistered((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]))
  }

  const value = useMemo<PurchaseContextValue>(
    () => ({
      ownedCourseIds,
      registeredEventIds,
      isOwned: (id) => ownedCourseIds.includes(id),
      isRegistered: (id) => registeredEventIds.includes(id),
      grantCourseAccess,
      purchaseCourse,
      registerEvent,
      paymentProvider,
    }),
    [ownedCourseIds, registeredEventIds],
  )

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePurchases(): PurchaseContextValue {
  const ctx = useContext(PurchaseContext)
  if (!ctx) throw new Error('usePurchases должен использоваться внутри PurchaseProvider')
  return ctx
}
