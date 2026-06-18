import type { Order } from '@/types'

/**
 * Демо-заказы (покупки программ) для админ-панели.
 * В продакшене заменяются ответом API (GET /admin/orders).
 */
export const orders: Order[] = [
  { id: 'ORD-1042', userId: 'u-103', courseId: 'digital-transformation', amount: 56000, date: '2026-06-15', status: 'paid', method: 'Карта' },
  { id: 'ORD-1041', userId: 'u-107', courseId: 'negotiations', amount: 42000, date: '2026-06-14', status: 'paid', method: 'Счёт' },
  { id: 'ORD-1040', userId: 'u-104', courseId: 'strategic-leadership', amount: 48000, date: '2026-06-13', status: 'pending', method: 'Счёт' },
  { id: 'ORD-1039', userId: 'u-101', courseId: 'public-speaking', amount: 28000, date: '2026-06-12', status: 'paid', method: 'СБП' },
  { id: 'ORD-1038', userId: 'u-108', courseId: 'digital-transformation', amount: 56000, date: '2026-06-10', status: 'paid', method: 'Карта' },
  { id: 'ORD-1037', userId: 'u-102', courseId: 'negotiations', amount: 42000, date: '2026-06-08', status: 'paid', method: 'Карта' },
  { id: 'ORD-1036', userId: 'u-105', courseId: 'public-speaking', amount: 28000, date: '2026-06-05', status: 'paid', method: 'СБП' },
  { id: 'ORD-1035', userId: 'u-103', courseId: 'strategic-leadership', amount: 48000, date: '2026-05-29', status: 'paid', method: 'Счёт' },
  { id: 'ORD-1034', userId: 'u-106', courseId: 'corporate-finance', amount: 36000, date: '2026-05-21', status: 'refunded', method: 'Карта' },
  { id: 'ORD-1033', userId: 'u-101', courseId: 'corporate-finance', amount: 36000, date: '2026-05-18', status: 'paid', method: 'Карта' },
  { id: 'ORD-1032', userId: 'u-107', courseId: 'strategic-leadership', amount: 48000, date: '2026-05-12', status: 'paid', method: 'Счёт' },
  { id: 'ORD-1031', userId: 'u-103', courseId: 'org-psychology', amount: 39000, date: '2026-05-04', status: 'paid', method: 'СБП' },
  { id: 'ORD-1030', userId: 'u-001', courseId: 'strategic-leadership', amount: 48000, date: '2026-04-22', status: 'paid', method: 'Карта' },
]
