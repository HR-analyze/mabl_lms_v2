import { Link } from 'react-router-dom'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ArrowRight, Book, Document, Grid, User } from '@/components/ui/Icon'
import { AdminPageHeader, StatCard, StatusPill } from '@/components/admin/AdminUI'
import { useCourses } from '@/context/CoursesContext'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { orderStatusLabel } from '@/lib/labels'
import { formatPrice } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const statusTone: Record<OrderStatus, 'positive' | 'neutral' | 'muted'> = {
  paid: 'positive',
  pending: 'neutral',
  refunded: 'muted',
}

/** Обзорная панель администратора: ключевые метрики и последняя активность. */
export default function AdminOverviewPage() {
  const { courses } = useCourses()
  const { data: usersData } = useAsync(() => api.users.list(), [])
  const { data: ordersData } = useAsync(() => api.orders.list(), [])

  const adminUsers = usersData ?? []
  const orders = ordersData ?? []
  const userById = new Map(adminUsers.map((u) => [u.id, u]))

  const students = adminUsers.filter((u) => u.role === 'student')
  const paidOrders = orders.filter((o) => o.status === 'paid')
  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const revenue = paidOrders.reduce((sum, o) => sum + o.amount, 0)

  // Записи по программам (из профилей участников).
  const enrollmentByCourse = new Map<string, number>()
  for (const u of students) {
    for (const cid of u.enrolledCourseIds) {
      enrollmentByCourse.set(cid, (enrollmentByCourse.get(cid) ?? 0) + 1)
    }
  }
  const maxEnroll = Math.max(1, ...enrollmentByCourse.values())
  const topCourses = [...courses]
    .map((c) => ({ course: c, count: enrollmentByCourse.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const recentOrders = [...orders]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5)

  return (
    <div>
      <AdminPageHeader
        title="Обзор платформы"
        description="Ключевые показатели академии: программы, участники, продажи и активность."
        actions={
          <Button to="/admin/courses/new" size="sm">
            + Добавить программу
          </Button>
        }
      />

      {/* KPI */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Программы" value={courses.length} hint="в каталоге" icon={<Grid width={18} height={18} />} />
        <StatCard label="Участники" value={students.length} hint={`${adminUsers.length} аккаунтов всего`} icon={<User width={18} height={18} />} />
        <StatCard
          label="Заказы"
          value={orders.length}
          hint={`${paidOrders.length} оплачено · ${pendingOrders.length} в ожидании`}
          icon={<Document width={18} height={18} />}
        />
        <StatCard label="Выручка" value={formatPrice(revenue)} hint="по оплаченным заказам" icon={<Book width={18} height={18} />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Последние заказы */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-neft">Последние заказы</h2>
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm uppercase tracking-wide text-ocean hover:text-oceanc-80">
              Все заказы <ArrowRight width={15} height={15} />
            </Link>
          </div>
          <Card>
            <ul className="divide-y divide-ink-10">
              {recentOrders.map((o) => {
                const user = userById.get(o.userId)
                const course = courses.find((c) => c.id === o.courseId)
                return (
                  <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neft">{user?.name ?? 'Участник'}</p>
                      <p className="truncate text-[0.78rem] text-ink-60">{course?.title ?? o.courseId}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="whitespace-nowrap text-sm text-neft">{formatPrice(o.amount)}</span>
                      <StatusPill tone={statusTone[o.status]}>{orderStatusLabel[o.status]}</StatusPill>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>

        {/* Популярные программы */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-neft">Записи по программам</h2>
            <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm uppercase tracking-wide text-ocean hover:text-oceanc-80">
              Программы <ArrowRight width={15} height={15} />
            </Link>
          </div>
          <Card>
            <CardBody className="space-y-4 p-5">
              {topCourses.map(({ course, count }) => (
                <div key={course.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-neft">{course.title}</span>
                    <span className="shrink-0 text-ink-60">{count}</span>
                  </div>
                  <ProgressBar value={Math.round((count / maxEnroll) * 100)} />
                </div>
              ))}
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  )
}
