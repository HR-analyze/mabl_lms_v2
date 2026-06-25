/**
 * Абстракция платёжного провайдера.
 *
 * Архитектура подготовлена под реальную платёжку (ЮKassa, Stripe, CloudPayments):
 * UI работает только с интерфейсом PaymentProvider и не знает о конкретной
 * реализации. Чтобы подключить боевой шлюз — реализуйте PaymentProvider и
 * замените `mockPaymentProvider` на свой инстанс в CheckoutPage / PurchaseContext.
 */
import { delay } from './utils'
import { API_URL } from '@/api/config'

export interface PaymentIntent {
  itemId: string
  itemTitle: string
  amount: number
  currency: 'RUB'
  /** идентификатор покупателя (mock) */
  customerEmail?: string
  /** id пользователя (для привязки заказа на бэкенде) */
  customerId?: string
}

export interface PaymentResult {
  /** redirect — пользователь уводится на платёжную форму внешнего шлюза. */
  status: 'succeeded' | 'failed' | 'redirect'
  transactionId: string
  intent: PaymentIntent
  message: string
  /** Ссылка на платёжную форму (для status === 'redirect'). */
  confirmationUrl?: string
}

export interface PaymentProvider {
  readonly name: string
  /**
   * Инициировать оплату. В реальной интеграции здесь происходит редирект
   * на платёжную форму / создание PaymentIntent на бэкенде.
   */
  pay(intent: PaymentIntent): Promise<PaymentResult>
}

/** Mock-провайдер: имитирует успешную оплату с задержкой «сети». */
export const mockPaymentProvider: PaymentProvider = {
  name: 'MABL Mock Pay',
  async pay(intent) {
    await delay(1400)
    return {
      status: 'succeeded',
      transactionId: 'MOCK-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      intent,
      message: 'Оплата успешно проведена (демо-режим).',
    }
  },
}

/**
 * Боевой провайдер ЮKassa.
 *
 * Секретов на фронте нет: создаём платёж на бэкенде (POST /api/payments/create),
 * получаем ссылку на платёжную форму и уводим пользователя туда. После оплаты
 * ЮKassa возвращает его на /checkout?...&order=<id>, где статус подтверждается
 * по GET /api/payments/by-order/<id> (плюс серверный webhook на /api/payments/webhook).
 */
export const yookassaPaymentProvider: PaymentProvider = {
  name: 'ЮKassa',
  async pay(intent) {
    const res = await fetch(`${API_URL}/payments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: intent.itemId,
        email: intent.customerEmail,
        userId: intent.customerId,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      confirmationUrl?: string
      orderId?: string
      message?: string
    }
    if (!res.ok || !data.confirmationUrl) {
      return {
        status: 'failed',
        transactionId: '',
        intent,
        message: data.message || 'Не удалось создать платёж. Попробуйте позже.',
      }
    }
    // Уводим на платёжную форму ЮKassa.
    window.location.assign(data.confirmationUrl)
    return {
      status: 'redirect',
      transactionId: data.orderId || '',
      intent,
      confirmationUrl: data.confirmationUrl,
      message: 'Переадресация на платёжную форму ЮKassa…',
    }
  },
}

/**
 * Активный провайдер выбирается переменной окружения VITE_PAYMENT_PROVIDER.
 * По умолчанию — mock (демо-режим), что позволяет «спать» интеграции до запуска.
 *   VITE_PAYMENT_PROVIDER=yookassa  → боевая оплата
 */
export function getActivePaymentProvider(): PaymentProvider {
  const name = (import.meta.env.VITE_PAYMENT_PROVIDER ?? 'mock').toLowerCase()
  return name === 'yookassa' ? yookassaPaymentProvider : mockPaymentProvider
}
