import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { mockPaymentProvider } from '@/lib/payments'
import type { PaymentIntent, PaymentResult, PaymentProvider } from '@/lib/payments'

/**
 * Управление доступом: купленные курсы и записи на события.
 * Источник — слой данных `api.enrollments` (mock — localStorage, http — БД).
 * После «оплаты» курс/событие открывается.
 */

interface PurchaseContextValue {
  ownedCourseIds: string[]
  registeredEventIds: string[]
  isOwned: (courseId: string) => boolean
  isRegistered: (eventId: string) => boolean
  /** Провести оплату курса и открыть доступ */
  purchaseCourse: (intent: PaymentIntent) => Promise<PaymentResult>
  /** Записаться на событие (с оплатой, если платное) */
  registerEvent: (eventId: string, intent?: PaymentIntent) => Promise<PaymentResult | void>
  /** Перезагрузить доступ из источника (после возврата с оплаты). */
  refreshAccess: () => Promise<void>
  paymentProvider: PaymentProvider
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null)

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ownedCourseIds, setOwned] = useState<string[]>([])
  const [registeredEventIds, setRegistered] = useState<string[]>([])

  const refreshAccess = async () => {
    const access = await api.enrollments.access()
    setOwned(access.courses)
    setRegistered(access.events)
  }

  // Загружаем доступ при старте и при смене пользователя (в http-режиме доступ — персональный).
  useEffect(() => {
    let active = true
    api.enrollments.access().then((access) => {
      if (!active) return
      setOwned(access.courses)
      setRegistered(access.events)
    })
    return () => {
      active = false
    }
  }, [user?.id])

  const purchaseCourse = async (intent: PaymentIntent): Promise<PaymentResult> => {
    const result = await api.enrollments.purchaseCourse(intent)
    // Доступ открываем только при мгновенном успехе; при redirect — после возврата с оплаты.
    if (result.status === 'succeeded') {
      setOwned((prev) => (prev.includes(intent.itemId) ? prev : [...prev, intent.itemId]))
    }
    return result
  }

  const registerEvent = async (eventId: string, intent?: PaymentIntent) => {
    const result = await api.enrollments.registerEvent(eventId, intent)
    if (!result || result.status === 'succeeded') {
      setRegistered((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]))
    }
    return result
  }

  const value = useMemo<PurchaseContextValue>(
    () => ({
      ownedCourseIds,
      registeredEventIds,
      isOwned: (id) => ownedCourseIds.includes(id),
      isRegistered: (id) => registeredEventIds.includes(id),
      purchaseCourse,
      registerEvent,
      refreshAccess,
      paymentProvider: mockPaymentProvider,
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
