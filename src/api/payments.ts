import { API_URL, http } from './config'

/**
 * Ресурс «Платежи» (боевая оплата ЮKassa).
 *
 * Создание платежа выполняет сам провайдер (см. src/lib/payments.ts) — он уводит
 * пользователя на платёжную форму. Здесь — только проверка статуса заказа на
 * странице возврата, чтобы подтвердить оплату не дожидаясь webhook.
 */

export interface PaymentConfig {
  provider: string
  configured: boolean
}

export interface OrderPaymentStatus {
  orderId: string
  status: 'paid' | 'pending' | 'refunded'
  paid: boolean
  courseId?: string
}

export const paymentsApi = {
  /** Доступна ли боевая оплата (заданы ли ключи на сервере). */
  async config(): Promise<PaymentConfig> {
    return http<PaymentConfig>('/payments/config')
  },

  /** Статус заказа после возврата с платёжной формы. */
  async statusByOrder(orderId: string): Promise<OrderPaymentStatus> {
    return http<OrderPaymentStatus>(`/payments/by-order/${encodeURIComponent(orderId)}`)
  },
}

export { API_URL }
