import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import type { ForumTopic } from '@/types'

const fieldBase =
  'w-full rounded-token border border-ink-20 bg-wisdom px-4 py-3 text-neft transition-colors focus:border-ocean focus:outline-none'

/** Пустой черновик темы. */
function blankTopic(sectionId: string): ForumTopic {
  return {
    id: '',
    sectionId,
    title: '',
    author: '',
    date: new Date().toISOString(),
    body: '',
    comments: [],
  }
}

/** Создание и редактирование темы форума. */
export default function AdminForumTopicEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const { data: sections } = useAsync(() => api.forum.listSections(), [])
  const { data: existing, loading } = useAsync(
    () => (id ? api.forum.getTopic(id) : Promise.resolve(undefined)),
    [id],
  )

  const [form, setForm] = useState<ForumTopic | null>(null)
  const [error, setError] = useState('')

  const sectionList = sections ?? []
  const sectionsReady = sections !== undefined
  const ready = (isNew || !loading) && sectionsReady

  if (form === null && ready) {
    setForm(existing ?? blankTopic(sectionList[0]?.id ?? ''))
  }

  if (!ready || form === null) {
    return <div className="py-16 text-center text-ink-60">Загрузка…</div>
  }

  if (!isNew && !existing) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-serif text-2xl text-neft">Тема не найдена</h1>
        <Button to="/admin/forum" className="mt-6" size="sm">
          ← К форуму
        </Button>
      </div>
    )
  }

  const set = <K extends keyof ForumTopic>(key: K, value: ForumTopic[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('Укажите заголовок темы.')
      return
    }
    if (!form.sectionId) {
      setError('Выберите раздел форума.')
      return
    }

    const payload: ForumTopic = {
      ...form,
      title: form.title.trim(),
      author: form.author.trim() || 'Администратор',
      body: form.body.trim(),
    }

    if (isNew) {
      await api.forum.createTopic(payload)
    } else {
      await api.forum.updateTopic(form.id, payload)
    }
    navigate('/admin/forum')
  }

  return (
    <div>
      <Link to="/admin/forum" className="text-sm text-ink-60 hover:text-neft">
        ← К форуму
      </Link>

      <div className="mt-4">
        <p className="eyebrow mb-3">{isNew ? 'Новая тема' : 'Редактирование'}</p>
        <h1 className="font-serif text-3xl text-neft">
          {isNew ? 'Создание темы' : form.title || 'Без названия'}
        </h1>
      </div>

      {sectionList.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-ink-20 py-12 text-center">
          <p className="text-ink-60">
            Сначала создайте раздел форума, затем добавьте тему.
          </p>
          <Button to="/admin/forum" size="sm" className="mt-6">
            ← К разделам
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-6">
          <label className="block">
            <span className="mb-2 block text-[0.72rem] uppercase tracking-wide text-ink-60">Раздел</span>
            <select
              className={cn(fieldBase)}
              value={form.sectionId}
              onChange={(e) => set('sectionId', e.target.value)}
            >
              {sectionList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Заголовок темы"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Например, Как выбрать стратегию роста?"
            required
          />

          <Input
            label="Автор"
            value={form.author}
            onChange={(e) => set('author', e.target.value)}
            placeholder="Имя автора темы"
          />

          <Textarea
            label="Текст темы"
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            placeholder="Опишите вопрос или тему для обсуждения."
            className="min-h-[180px]"
          />

          {!isNew && (
            <p className="text-sm text-ink-60">
              Ответов в теме: {form.comments.length}. Комментарии сохраняются без изменений.
            </p>
          )}

          {error && (
            <div className="rounded-token border border-ocean/40 bg-oceanc-10 px-4 py-3 text-sm text-ocean">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-ink-10 pt-6">
            <Button type="submit">{isNew ? 'Создать тему' : 'Сохранить изменения'}</Button>
            <Button to="/admin/forum" variant="secondary">
              Отмена
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
