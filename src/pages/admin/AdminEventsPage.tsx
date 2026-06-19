import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AdminPageHeader, StatCard } from '@/components/admin/AdminUI'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime, formatPrice, cn } from '@/lib/utils'
import type { CalendarEventType } from '@/types'

const filters: { key: CalendarEventType | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'Вебинар', label: 'Вебинары' },
  { key: 'Мероприятие', label: 'Мероприятия' },
  { key: 'Дедлайн', label: 'Дедлайны' },
]

const NOW = new Date()

/** Управление событиями и вебинарами академии (список + действия). */
export default function AdminEventsPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading } = useAsync(() => api.events.list(), [reloadKey])
  const events = useMemo(() => data ?? [], [data])
  const [type, setType] = useState<CalendarEventType | 'all'>('all')

  const reload = () => setReloadKey((k) => k + 1)

  const sorted = useMemo(
    () => [...events].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [events],
  )
  const filtered = useMemo(
    () => (type === 'all' ? sorted : sorted.filter((e) => e.type === type)),
    [sorted, type],
  )

  const upcoming = events.filter((e) => new Date(e.date) >= NOW).length
  const webinars = events.filter((e) => e.type === 'Вебинар').length

  const onDelete = async (id: string, title: string) => {
    if (window.confirm(`Удалить событие «${title}»? Действие необратимо.`)) {
      await api.events.remove(id)
      reload()
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="События"
        description="Вебинары, мероприятия и дедлайны академии в едином расписании."
        actions={
          <Button to="/admin/events/new" size="sm">
            + Добавить событие
          </Button>
        }
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <StatCard label="Всего событий" value={events.length} />
        <StatCard label="Предстоящие" value={upcoming} />
        <StatCard label="Вебинары" value={webinars} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setType(f.key)}
            className={cn(
              'rounded-token px-3.5 py-2 text-[0.72rem] uppercase tracking-wide transition-colors',
              type === f.key
                ? 'bg-neft text-wisdom'
                : 'border border-ink-20 text-ink-60 hover:border-neft hover:text-neft',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-ink-10">
        {loading && (
          <div className="px-5 py-16 text-center text-ink-60">Загрузка событий…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-5 py-16 text-center text-ink-60">
            Событий пока нет. Добавьте первый вебинар или мероприятие.
          </div>
        )}
        <ul className="divide-y divide-ink-10">
          {filtered.map((e) => {
            const past = new Date(e.date) < NOW
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-card bg-ink-5">
                  <span className="font-serif text-lg leading-none text-neft">
                    {new Date(e.date).getDate()}
                  </span>
                  <span className="text-[0.6rem] uppercase text-ink-60">
                    {new Date(e.date).toLocaleString('ru-RU', { month: 'short' })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="outline">{e.type}</Badge>
                    {past && <span className="text-[0.66rem] uppercase tracking-wide text-ink-40">Завершено</span>}
                  </div>
                  <Link
                    to={`/admin/events/${e.id}`}
                    className="mt-1.5 block truncate font-medium text-neft hover:text-ocean"
                  >
                    {e.title}
                  </Link>
                  <p className="text-[0.78rem] text-ink-60">
                    {formatDateTime(e.date)}
                    {e.speaker ? ` · ${e.speaker}` : ''} · {e.location}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-neft">
                    {e.price && e.price > 0 ? formatPrice(e.price) : 'Бесплатно'}
                  </p>
                  {e.registrable && (
                    <p className="text-[0.7rem] uppercase tracking-wide text-ink-40">Запись открыта</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button to={`/admin/events/${e.id}`} variant="ghost" size="sm">
                    Изменить
                  </Button>
                  <button
                    onClick={() => onDelete(e.id, e.title)}
                    className="whitespace-nowrap rounded-token px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-ocean hover:bg-oceanc-10"
                  >
                    Удалить
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
