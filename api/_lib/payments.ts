/**
 * Серверная абстракция платежей. Провайдер выбирается переменной PAYMENT_PROVIDER:
 *   - 'simulated' (по умолчанию): оплата считается успешной сразу;
 *   - 'yookassa': создаётся платёж в ЮKassa, пользователь редиректится на оплату,
 *     подтверждение приходит вебхуком (POST /api/payments/webhook).
 *
 * Подключение боевого шлюза = задать PAYMENT_PROVIDER=yookassa,
 * YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY. Stripe/CloudPayments добавляются здесь же.
 */

const PROVIDER = process.env.PAYMENT_PROVIDER ?? 'simulated'

export type PaymentInit =
  | { kind: 'paid' }
  | { kind: 'redirect'; confirmationUrl: string }

interface CreateArgs {
  orderId: string
  amount: number
  description: string
  returnUrl: string
}

function yookassaAuth(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secret = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secret) {
    throw new Error('Не заданы YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY.')
  }
  return Buffer.from(`${shopId}:${secret}`).toString('base64')
}

/** Инициировать оплату курса. */
export async function createCoursePayment(args: CreateArgs): Promise<PaymentInit> {
  if (PROVIDER !== 'yookassa') return { kind: 'paid' }

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${yookassaAuth()}`,
      'Idempotence-Key': args.orderId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { value: args.amount.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: args.returnUrl },
      description: args.description,
      metadata: { orderId: args.orderId },
    }),
  })
  if (!res.ok) {
    throw new Error(`ЮKassa: ошибка создания платежа (${res.status}).`)
  }
  const data = (await res.json()) as { confirmation?: { confirmation_url?: string } }
  const url = data.confirmation?.confirmation_url
  if (!url) throw new Error('ЮKassa: не получен URL подтверждения.')
  return { kind: 'redirect', confirmationUrl: url }
}

/** Проверить платёж в ЮKassa (для вебхука). Возвращает статус или null. */
export async function fetchPaymentStatus(paymentId: string): Promise<string | null> {
  if (PROVIDER !== 'yookassa') return null
  const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${yookassaAuth()}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { status?: string }
  return data.status ?? null
}
