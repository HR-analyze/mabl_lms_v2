import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPageHeader, StatCard } from '@/components/admin/AdminUI'
import { api } from '@/api'
import type { FeedbackEntry, FeedbackTarget } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useCourses } from '@/context/CoursesContext'
import { getProgramById } from '@/data/programs'
import { cn, displayTitle, formatDateTime } from '@/lib/utils'

const filters: { key: FeedbackTarget | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'course', label: 'Курсы' },
  { key: 'program', label: 'Программы' },
]

function Stars({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap text-ocean" aria-label={`${value} из 5`}>
      {'★'.repeat(value)}
      <span className="text-ink-20">{'★'.repeat(5 - value)}</span>
    </span>
  )
}

const average = (items: FeedbackEntry[]) =>
  items.length ? items.reduce((sum, f) => sum + f.rating, 0) / items.length : 0

const formatAvg = (n: number) => (n ? n.toFixed(1).replace('.', ',') : '—')

/** 1 оценка, 2 оценки, 5 оценок, 21 оценка, 112 оценок. */
function ratingsWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'оценка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'оценки'
  return 'оценок'
}

/** Оценки и отзывы слушателей по курсам и программам. */
export default function AdminFeedbackPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useAsync(() => api.feedback.list(), [reloadKey])
  const { getCourseById } = useCourses()
  const [type, setType] = useState<FeedbackTarget | 'all'>('all')

  const items = useMemo(() => data ?? [], [data])
  const filtered = useMemo(
    () => (type === 'all' ? items : items.filter((f) => f.targetType === type)),
    [items, type],
  )

  const targetTitle = (f: Pick<FeedbackEntry, 'targetType' | 'targetId'>) => {
    if (f.targetType === 'course') {
      const course = getCourseById(f.targetId)
      return course ? displayTitle(course.title) : f.targetId
    }
    return getProgramById(f.targetId)?.title ?? f.targetId
  }
  const targetLink = (f: Pick<FeedbackEntry, 'targetType' | 'targetId'>) =>
    `/${f.targetType === 'course' ? 'courses' : 'programs'}/${encodeURIComponent(f.targetId)}`

  // Сводка по объектам: средняя и число оценок, худшие сверху — их и разбирать.
  const summary = useMemo(() => {
    const groups = new Map<string, FeedbackEntry[]>()
    for (const f of filtered) {
      const key = `${f.targetType}:${f.targetId}`
      groups.set(key, [...(groups.get(key) ?? []), f])
    }
    return Array.from(groups.values())
      .map((list) => ({ first: list[0], count: list.length, avg: average(list) }))
      .sort((a, b) => a.avg - b.avg)
  }, [filtered])

  const onDelete = async (f: FeedbackEntry) => {
    if (!window.confirm('Удалить отзыв? Действие необратимо.')) return
    await api.feedback.remove(f)
    setReloadKey((k) => k + 1)
  }

  const withText = filtered.filter((f) => f.comment).length

  return (
    <div>
      <AdminPageHeader
        title="Отзывы"
        description="Оценки от 1 до 5 и отзывы слушателей со страниц курсов и программ. Один отзыв на слушателя: повторная отправка обновляет прежний."
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <StatCard label="Всего оценок" value={filtered.length} />
        <StatCard label="Средняя оценка" value={formatAvg(average(filtered))} hint="из 5" />
        <StatCard label="С текстом" value={withText} />
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

      {loading ? (
        <div className="mt-6 px-5 py-16 text-center text-ink-60">Загрузка отзывов…</div>
      ) : error ? (
        <div className="mt-6 px-5 py-16 text-center text-ocean">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-card border border-ink-10 px-5 py-16 text-center text-ink-60">
          Отзывов пока нет.
        </div>
      ) : (
        <>
          <h2 className="mt-10 font-serif text-xl text-neft">По программам и курсам</h2>
          <ul className="mt-4 divide-y divide-ink-10 overflow-hidden rounded-card border border-ink-10">
            {summary.map(({ first, count, avg }) => (
              <li
                key={`${first.targetType}:${first.targetId}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <Link to={targetLink(first)} className="min-w-0 text-sm text-neft hover:text-ocean">
                  <span className="mr-2 text-[0.68rem] uppercase tracking-wide text-ink-40">
                    {first.targetType === 'course' ? 'Курс' : 'Программа'}
                  </span>
                  {targetTitle(first)}
                </Link>
                <span className="text-sm text-ink-60">
                  <span className="font-semibold text-neft">{formatAvg(avg)}</span> · {count} {ratingsWord(count)}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-serif text-xl text-neft">Все отзывы</h2>
          <ul className="mt-4 divide-y divide-ink-10 overflow-hidden rounded-card border border-ink-10">
            {filtered.map((f) => (
              <li key={`${f.targetType}:${f.targetId}:${f.userId}`} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-neft">
                      <Stars value={f.rating} />{' '}
                      <Link to={targetLink(f)} className="ml-2 hover:text-ocean">
                        {targetTitle(f)}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-[0.74rem] text-ink-60">
                      {f.userName ?? 'Удалённый аккаунт'}
                      {f.userEmail && (
                        <>
                          {' · '}
                          <a href={`mailto:${f.userEmail}`} className="hover:text-ocean">
                            {f.userEmail}
                          </a>
                        </>
                      )}
                      {' · '}
                      {formatDateTime(f.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(f)}
                    className="whitespace-nowrap rounded-token px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-ocean hover:bg-oceanc-10"
                  >
                    Удалить
                  </button>
                </div>
                {f.comment && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink-80">{f.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
