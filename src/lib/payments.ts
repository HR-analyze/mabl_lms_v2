/**
 * Абстракция платёжного провайдера.
 *
 * Архитектура подготовлена под реальную платёжку (ЮKassa, Stripe, CloudPayments):
 * UI работает только с интерфейсом PaymentProvider и не знает о конкретной
 * реализации. Чтобы подключить боевой шлюз — реализуйте PaymentProvider и
 * замените `mockPaymentProvider` на свой инстанс в CheckoutPage / PurchaseContext.
 */
import { delay } from './utils'

export interface PaymentIntent {
  itemId: string
  itemTitle: string
  amount: number
  currency: 'RUB'
  /** идентификатор покупателя (mock) */
  customerEmail?: string
}

export interface PaymentResult {
  status: 'succeeded' | 'failed'
  transactionId: string
  intent: PaymentIntent
  message: string
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
