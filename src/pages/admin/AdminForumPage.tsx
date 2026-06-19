import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { AdminPageHeader } from '@/components/admin/AdminUI'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/lib/utils'
import type { ForumSection } from '@/types'

/** Админ-панель: управление разделами и темами форума. */
export default function AdminForumPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data: sectionsData } = useAsync(() => api.forum.listSections(), [reloadKey])
  const { data: topicsData, loading } = useAsync(() => api.forum.listTopics(), [reloadKey])
  const sections = sectionsData ?? []
  const topics = topicsData ?? []

  const reload = () => setReloadKey((k) => k + 1)

  // Форма нового раздела.
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const addSection = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await api.forum.createSection({
      id: '',
      title: newTitle.trim(),
      description: newDescription.trim(),
      topicsCount: 0,
    } as ForumSection)
    setNewTitle('')
    setNewDescription('')
    reload()
  }

  const deleteSection = async (id: string, title: string) => {
    if (
      window.confirm(
        `Удалить раздел «${title}» вместе со всеми его темами? Действие необратимо.`,
      )
    ) {
      await api.forum.removeSection(id)
      reload()
    }
  }

  const deleteTopic = async (id: string, title: string) => {
    if (window.confirm(`Удалить тему «${title}»? Действие необратимо.`)) {
      await api.forum.removeTopic(id)
      reload()
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Форум"
        description={`Разделов: ${sections.length} · тем: ${topics.length}. Создавайте разделы и обсуждения сообщества.`}
        actions={
          sections.length > 0 ? (
            <Button to="/admin/forum/new" size="sm">
              + Добавить тему
            </Button>
          ) : undefined
        }
      />

      {/* Разделы */}
      <section className="mt-10">
        <h2 className="font-serif text-xl text-neft">Разделы</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {sections.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-card border border-ink-10 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-neft">{s.title}</p>
                <p className="truncate text-sm text-ink-60">{s.description}</p>
                <p className="mt-1 text-[0.7rem] uppercase tracking-wide text-ink-40">
                  {s.topicsCount} тем
                </p>
              </div>
              <button
                onClick={() => deleteSection(s.id, s.title)}
                className="shrink-0 whitespace-nowrap rounded-token px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-ocean hover:bg-oceanc-10"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>

        {/* Форма добавления раздела */}
        <form
          onSubmit={addSection}
          className="mt-4 grid gap-3 rounded-card border border-dashed border-ink-20 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <Input
            label="Новый раздел"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Например, Лидерство и стратегия"
          />
          <Input
            label="Описание"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Коротко о теме раздела"
          />
          <Button type="submit" size="sm" disabled={!newTitle.trim()}>
            Добавить раздел
          </Button>
        </form>
      </section>

      {/* Темы */}
      <section className="mt-12">
        <h2 className="font-serif text-xl text-neft">Обсуждения</h2>

        {loading ? (
          <div className="mt-4 rounded-card border border-ink-10 px-5 py-12 text-center text-ink-60">
            Загрузка тем…
          </div>
        ) : topics.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-card border border-ink-10">
            <ul className="divide-y divide-ink-10">
              {topics.map((t) => {
                const section = sections.find((s) => s.id === t.sectionId)
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      {section && <Badge tone="outline">{section.title}</Badge>}
                      <Link
                        to={`/admin/forum/${t.id}`}
                        className="mt-1.5 block truncate font-serif text-lg text-neft hover:text-ocean"
                      >
                        {t.title}
                      </Link>
                      <p className="text-[0.78rem] text-ink-60">
                        {t.author} · {formatDate(t.date)} · {t.comments.length} ответов
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <Button to={`/admin/forum/${t.id}`} variant="ghost" size="sm">
                        Изменить
                      </Button>
                      <button
                        onClick={() => deleteTopic(t.id, t.title)}
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
        ) : (
          <div className="mt-4 rounded-card border border-dashed border-ink-20 py-16 text-center">
            <p className="font-serif text-lg text-neft">Тем пока нет</p>
            <p className="mt-2 text-ink-60">
              {sections.length === 0
                ? 'Сначала создайте раздел, затем добавьте первую тему.'
                : 'Создайте первое обсуждение сообщества.'}
            </p>
            {sections.length > 0 && (
              <Button to="/admin/forum/new" size="sm" className="mt-6">
                + Добавить тему
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
