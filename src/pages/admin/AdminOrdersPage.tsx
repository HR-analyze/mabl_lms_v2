import { useMemo, useState } from 'react'
import { AdminPageHeader, StatCard, StatusPill } from '@/components/admin/AdminUI'
import { useCourses } from '@/context/CoursesContext'
import { getAdminUserById } from '@/data/users'
import { orders } from '@/data/orders'
import { orderStatusLabel } from '@/lib/labels'
import { formatDate, formatPrice, cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const statusTone: Record<OrderStatus, 'positive' | 'neutral' | 'muted'> = {
  paid: 'positive',
  pending: 'neutral',
  refunded: 'muted',
}

const filters: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'paid', label: 'Оплаченные' },
  { key: 'pending', label: 'В ожидании' },
  { key: 'refunded', label: 'Возвраты' },
]

/** Заказы (покупки программ). */
export default function AdminOrdersPage() {
  const { getCourseById } = useCourses()
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')

  const sorted = useMemo(
    () => [...orders].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [],
  )
  const filtered = useMemo(
    () => (status === 'all' ? sorted : sorted.filter((o) => o.status === status)),
    [sorted, status],
  )

  const revenue = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amount, 0)
  const pendingSum = orders.filter((o) => o.status === 'pending').reduce((s, o) => s + o.amount, 0)
  const avgCheck = orders.filter((o) => o.status === 'paid').length
    ? Math.round(revenue / orders.filter((o) => o.status === 'paid').length)
    : 0

  return (
    <div>
      <AdminPageHeader
        title="Заказы"
        description="История покупок программ участниками: суммы, способы оплаты и статусы."
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <StatCard label="Выручка" value={formatPrice(revenue)} hint="оплаченные заказы" />
        <StatCard label="В ожидании оплаты" value={formatPrice(pendingSum)} />
        <StatCard label="Средний чек" value={formatPrice(avgCheck)} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={cn(
              'rounded-token px-3.5 py-2 text-[0.72rem] uppercase tracking-wide transition-colors',
              status === f.key
                ? 'bg-neft text-wisdom'
                : 'border border-ink-20 text-ink-60 hover:border-neft hover:text-neft',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-ink-10">
        <div className="hidden grid-cols-12 gap-4 border-b border-ink-10 bg-ink-5 px-5 py-3 text-[0.68rem] uppercase tracking-wide text-ink-60 md:grid">
          <span className="col-span-2">Заказ</span>
          <span className="col-span-3">Участник</span>
          <span className="col-span-3">Программа</span>
          <span className="col-span-2 text-right">Сумма</span>
          <span className="col-span-2 text-right">Статус</span>
        </div>

        {filtered.length > 0 ? (
          <ul className="divide-y divide-ink-10">
            {filtered.map((o) => {
              const user = getAdminUserById(o.userId)
              const course = getCourseById(o.courseId)
              return (
                <li
                  key={o.id}
                  className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-12 md:items-center md:gap-4"
                >
                  <div className="md:col-span-2">
                    <p className="font-mono text-[0.8rem] text-neft">{o.id}</p>
                    <p className="text-[0.7rem] text-ink-40">{formatDate(o.date)} · {o.method}</p>
                  </div>
                  <div className="min-w-0 md:col-span-3">
                    <p className="truncate text-sm text-neft">{user?.name ?? 'Участник'}</p>
                    <p className="truncate text-[0.74rem] text-ink-60">{user?.email}</p>
                  </div>
                  <div className="min-w-0 text-sm text-ink-80 md:col-span-3">
                    <span className="truncate">{course?.title ?? o.courseId}</span>
                  </div>
                  <div className="whitespace-nowrap text-sm text-neft md:col-span-2 md:text-right">
                    {formatPrice(o.amount)}
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <StatusPill tone={statusTone[o.status]}>{orderStatusLabel[o.status]}</StatusPill>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="px-5 py-16 text-center text-ink-60">Заказов с таким статусом нет.</div>
        )}
      </div>
    </div>
  )
}
