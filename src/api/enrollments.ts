import { USE_MOCK, http } from './config'
import { mockPaymentProvider } from '@/lib/payments'
import type { PaymentIntent, PaymentResult } from '@/lib/payments'

/**
 * Ресурс «Доступ слушателя»: купленные программы и записи на события.
 * mock — состояние в localStorage + имитация оплаты; http — реальные
 * enrollments/orders на бэкенде (платёж имитируется на сервере до подключения PSP).
 */

const OWNED_KEY = 'mabl.owned.courses'
const EVENTS_KEY = 'mabl.registered.events'
// Демо-слушатель уже владеет одним курсом (для наглядного прогресса в ЛК).
const DEFAULT_OWNED = ['strategic-leadership']

export interface Access {
  courses: string[]
  events: string[]
}

function loadList(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as string[]) : fallback
  } catch {
    return fallback
  }
}

function saveList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export const enrollmentsApi = {
  async access(): Promise<Access> {
    if (!USE_MOCK) return http<Access>('/me/access')
    return { courses: loadList(OWNED_KEY, DEFAULT_OWNED), events: loadList(EVENTS_KEY, []) }
  },

  async purchaseCourse(intent: PaymentIntent): Promise<PaymentResult> {
    if (!USE_MOCK) {
      const returnUrl = `${location.origin}/payment/return?course=${intent.itemId}`
      const r = await http<{
        status: PaymentResult['status']
        transactionId: string
        message: string
        confirmationUrl?: string
      }>(`/me/courses/${intent.itemId}/purchase`, {
        method: 'POST',
        body: JSON.stringify({ amount: intent.amount, method: 'Карта', returnUrl }),
      })
      return { ...r, intent }
    }
    const result = await mockPaymentProvider.pay(intent)
    if (result.status === 'succeeded') {
      const owned = loadList(OWNED_KEY, DEFAULT_OWNED)
      if (!owned.includes(intent.itemId)) saveList(OWNED_KEY, [...owned, intent.itemId])
    }
    return result
  },

  async registerEvent(eventId: string, intent?: PaymentIntent): Promise<PaymentResult | void> {
    if (!USE_MOCK) {
      const r = await http<
        { status: PaymentResult['status']; transactionId: string; message: string } | null
      >(`/me/events/${eventId}/register`, {
        method: 'POST',
        body: JSON.stringify(intent ? { amount: intent.amount } : {}),
      })
      return r && intent ? { ...r, intent } : undefined
    }
    if (intent && intent.amount > 0) {
      const result = await mockPaymentProvider.pay(intent)
      if (result.status === 'succeeded') {
        const list = loadList(EVENTS_KEY, [])
        if (!list.includes(eventId)) saveList(EVENTS_KEY, [...list, eventId])
      }
      return result
    }
    const list = loadList(EVENTS_KEY, [])
    if (!list.includes(eventId)) saveList(EVENTS_KEY, [...list, eventId])
  },
}
