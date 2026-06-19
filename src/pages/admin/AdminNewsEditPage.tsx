import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import type { NewsCategory, NewsItem } from '@/types'

const CATEGORIES: NewsCategory[] = ['Академия', 'Вебинары', 'Курсы', 'События']

const fieldBase =
  'w-full rounded-token border border-ink-20 bg-wisdom px-4 py-3 text-neft transition-colors focus:border-ocean focus:outline-none'

/** Пустой черновик новости (по умолчанию — сегодняшняя дата). */
function blankNews(): NewsItem {
  return {
    id: '',
    title: '',
    excerpt: '',
    body: [],
    category: 'Академия',
    date: new Date().toISOString().slice(0, 10),
    readingTime: '3 мин',
  }
}

/** Создание и редактирование новости. */
export default function AdminNewsEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const { data: existing, loading } = useAsync(
    () => (id ? api.news.get(id) : Promise.resolve(undefined)),
    [id],
  )

  const [form, setForm] = useState<NewsItem | null>(null)
  const [bodyText, setBodyText] = useState('')
  const [error, setError] = useState('')

  // Инициализация формы после загрузки (или сразу для новой записи).
  const ready = isNew || !loading
  if (form === null && ready) {
    const initial = existing ?? blankNews()
    setForm(initial)
    setBodyText((initial.body ?? []).join('\n\n'))
  }

  if (!ready || form === null) {
    return <div className="py-16 text-center text-ink-60">Загрузка…</div>
  }

  if (!isNew && !existing) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-serif text-2xl text-neft">Новость не найдена</h1>
        <Button to="/admin/news" className="mt-6" size="sm">
          ← К списку новостей
        </Button>
      </div>
    )
  }

  const set = <K extends keyof NewsItem>(key: K, value: NewsItem[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('Укажите заголовок новости.')
      return
    }
    const body = bodyText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)

    const payload: NewsItem = {
      ...form,
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      body,
    }

    if (isNew) {
      await api.news.create(payload)
    } else {
      await api.news.update(form.id, payload)
    }
    navigate('/admin/news')
  }

  return (
    <div>
      <Link to="/admin/news" className="text-sm text-ink-60 hover:text-neft">
        ← К списку новостей
      </Link>

      <div className="mt-4">
        <p className="eyebrow mb-3">{isNew ? 'Новая новость' : 'Редактирование'}</p>
        <h1 className="font-serif text-3xl text-neft">
          {isNew ? 'Создание новости' : form.title || 'Без названия'}
        </h1>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <Input
          label="Заголовок"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Например, МАБЛ открывает академический сезон"
          required
        />

        <Textarea
          label="Краткое описание (анонс)"
          value={form.excerpt}
          onChange={(e) => set('excerpt', e.target.value)}
          placeholder="Короткий анонс для карточки новости."
        />

        <div className="grid gap-6 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-[0.72rem] uppercase tracking-wide text-ink-60">Категория</span>
            <select
              className={cn(fieldBase)}
              value={form.category}
              onChange={(e) => set('category', e.target.value as NewsCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Дата публикации"
            type="date"
            value={form.date.slice(0, 10)}
            onChange={(e) => set('date', e.target.value)}
          />

          <Input
            label="Время чтения"
            value={form.readingTime}
            onChange={(e) => set('readingTime', e.target.value)}
            placeholder="3 мин"
          />
        </div>

        <Textarea
          label="Текст новости"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder="Полный текст новости. Разделяйте абзацы пустой строкой."
          className="min-h-[220px]"
        />

        {error && (
          <div className="rounded-token border border-ocean/40 bg-oceanc-10 px-4 py-3 text-sm text-ocean">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-ink-10 pt-6">
          <Button type="submit">{isNew ? 'Опубликовать' : 'Сохранить изменения'}</Button>
          <Button to="/admin/news" variant="secondary">
            Отмена
          </Button>
        </div>
      </form>
    </div>
  )
}
