import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Document } from '@/components/ui/Icon'
import { AdminPageHeader } from '@/components/admin/AdminUI'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/lib/utils'

/** Админ-панель: управление новостями (список + действия). */
export default function AdminNewsPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const { data, loading } = useAsync(() => api.news.list(), [reloadKey])
  const news = data ?? []

  const reload = () => setReloadKey((k) => k + 1)

  const onDelete = async (id: string, title: string) => {
    if (window.confirm(`Удалить новость «${title}»? Действие необратимо.`)) {
      await api.news.remove(id)
      reload()
    }
  }

  const onSync = async () => {
    setSyncing(true)
    try {
      const result = await api.news.sync()
      reload()
      window.alert(
        `Импортировано из Telegram-канала @${result.channel}: ${result.synced} публикаций.`,
      )
    } catch (err) {
      window.alert(
        `Не удалось обновить из Telegram: ${
          err instanceof Error ? err.message : 'неизвестная ошибка'
        }`,
      )
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Новости"
        description={`Всего публикаций: ${news.length}. Создавайте, редактируйте и удаляйте новости академии.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={onSync} disabled={syncing}>
              {syncing ? 'Обновление…' : '↻ Обновить из Telegram'}
            </Button>
            <Button to="/admin/news/new" size="sm">
              + Добавить новость
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="mt-10 rounded-card border border-ink-10 px-5 py-16 text-center text-ink-60">
          Загрузка новостей…
        </div>
      ) : news.length > 0 ? (
        <div className="mt-10 overflow-hidden rounded-card border border-ink-10">
          <ul className="divide-y divide-ink-10">
            {news.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="ocean">{item.category}</Badge>
                    <span className="text-[0.7rem] uppercase tracking-wide text-ink-40">
                      {formatDate(item.date)} · {item.readingTime}
                    </span>
                  </div>
                  <Link
                    to={`/admin/news/${item.id}`}
                    className="mt-1.5 block truncate font-serif text-lg text-neft hover:text-ocean"
                  >
                    {item.title}
                  </Link>
                  <p className="truncate text-sm text-ink-60">{item.excerpt}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button to={`/admin/news/${item.id}`} variant="ghost" size="sm">
                    Изменить
                  </Button>
                  <button
                    onClick={() => onDelete(item.id, item.title)}
                    className="whitespace-nowrap rounded-token px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-ocean hover:bg-oceanc-10"
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-10 rounded-card border border-dashed border-ink-20 py-20 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink-5 text-ink-60">
            <Document width={24} height={24} />
          </span>
          <p className="mt-4 font-serif text-xl text-neft">Новостей пока нет</p>
          <p className="mt-2 text-ink-60">Опубликуйте первую новость академии.</p>
          <Button to="/admin/news/new" size="sm" className="mt-6">
            + Добавить новость
          </Button>
        </div>
      )}
    </div>
  )
}
