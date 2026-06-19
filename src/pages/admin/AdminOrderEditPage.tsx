import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCourses } from '@/context/CoursesContext'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { orderStatusLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Order, OrderStatus, PaymentMethod } from '@/types'

const STATUSES: OrderStatus[] = ['paid', 'pending', 'refunded']
const METHODS: PaymentMethod[] = ['Карта', 'Счёт', 'СБП']

const fieldBase =
  'w-full rounded-token border border-ink-20 bg-wisdom px-4 py-3 text-neft transition-colors focus:border-ocean focus:outline-none'

/** Пустой черновик заказа. */
function blankOrder(): Order {
  return {
    id: '',
    userId: '',
    courseId: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    status: 'pending',
    method: 'Карта',
  }
}

/** Создание и редактирование заказа. */
export default function AdminOrderEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const { courses } = useCourses()

  const { data: usersData } = useAsync(() => api.users.list(), [])
  const { data: existing, loading } = useAsync(
    () => (id ? api.orders.get(id) : Promise.resolve(undefined)),
    [id],
  )

  const users = usersData ?? []
  const usersReady = usersData !== undefined
  const ready = (isNew || !loading) && usersReady

  const [form, setForm] = useState<Order | null>(null)
  const [error, setError] = useState('')

  if (form === null && ready) {
    setForm(existing ?? blankOrder())
  }

  if (!ready || form === null) {
    return <div className="py-16 text-center text-ink-60">Загрузка…</div>
  }

  if (!isNew && !existing) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-serif text-2xl text-neft">Заказ не найден</h1>
        <Button to="/admin/orders" className="mt-6" size="sm">
          ← К списку заказов
        </Button>
      </div>
    )
  }

  const set = <K extends keyof Order>(key: K, value: Order[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const num = (value: string) => {
    const n = Number(value.replace(/\s/g, ''))
    return Number.isFinite(n) ? n : 0
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.userId) {
      setError('Выберите участника.')
      return
    }
    if (!form.courseId) {
      setError('Выберите программу.')
      return
    }

    const payload: Order = { ...form, amount: Math.max(0, form.amount) }

    if (isNew) {
      await api.orders.create(payload)
    } else {
      await api.orders.update(form.id, payload)
    }
    navigate('/admin/orders')
  }

  // Подставляем цену программы при выборе (для нового заказа).
  const onCourseChange = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    setForm((prev) =>
      prev
        ? { ...prev, courseId, amount: isNew && course ? course.price : prev.amount }
        : prev,
    )
  }

  return (
    <div>
      <Link to="/admin/orders" className="text-sm text-ink-60 hover:text-neft">
        ← К списку заказов
      </Link>

      <div className="mt-4">
        <p className="eyebrow mb-3">{isNew ? 'Новый заказ' : 'Редактирование'}</p>
        <h1 className="font-serif text-3xl text-neft">
          {isNew ? 'Создание заказа' : form.id}
        </h1>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[0.72rem] uppercase tracking-wide text-ink-60">Участник</span>
            <select
              className={cn(fieldBase)}
              value={form.userId}
              onChange={(e) => set('userId', e.target.value)}
            >
              <option value="">— выберите участника —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[0.72rem] uppercase tracking-wide text-ink-60">Программа</span>
            <select
              className={cn(fieldBase)}
              value={form.courseId}
              onChange={(e) => onCourseChange(e.target.value)}
            >
              <option value="">— выберите программу —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            label="Сумма, ₽"
            type="number"
            min={0}
            value={String(form.amount)}
            onChange={(e) => set('amount', num(e.target.value))}
          />
          <Input
            label="Дата заказа"
            type="date"
            value={form.date.slice(0, 10)}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[0.72rem] uppercase tracking-wide text-ink-60">Статус</span>
            <select
              className={cn(fieldBase)}
              value={form.status}
              onChange={(e) => set('status', e.target.value as OrderStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {orderStatusLabel[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[0.72rem] uppercase tracking-wide text-ink-60">Способ оплаты</span>
            <select
              className={cn(fieldBase)}
              value={form.method}
              onChange={(e) => set('method', e.target.value as PaymentMethod)}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="rounded-token border border-ocean/40 bg-oceanc-10 px-4 py-3 text-sm text-ocean">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-ink-10 pt-6">
          <Button type="submit">{isNew ? 'Создать заказ' : 'Сохранить изменения'}</Button>
          <Button to="/admin/orders" variant="secondary">
            Отмена
          </Button>
        </div>
      </form>
    </div>
  )
}
