import type { NewsItem, NewsComment, NewsReactions } from '@/types'
import { news as seedNews } from '@/data/news'
import { USE_MOCK, http, mockDelay } from './config'
import { makeStore, slugify, uniqueId } from './_store'

// --- Локальное хранилище комментариев/реакций для mock-режима ---
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const writeJson = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))
const commentsKey = (id: string) => `mabl.news.comments.${id}`
const reactionsKey = (id: string) => `mabl.news.reactions.${id}`

function aggregateReactions(raw: { userId: string; emoji: string }[], userId?: string): NewsReactions {
  const counts: Record<string, number> = {}
  for (const r of raw) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
  const mine = userId ? raw.filter((r) => r.userId === userId).map((r) => r.emoji) : []
  return { counts, mine }
}

/**
 * Ресурс «Новости». Источник истины для публичного раздела и админ-панели.
 * mock-реализация хранит данные в localStorage; http-реализация ходит на бэкенд.
 */

const store = makeStore<NewsItem>('mabl.news.v1', seedNews)

export const newsApi = {
  async list(): Promise<NewsItem[]> {
    if (!USE_MOCK) return http<NewsItem[]>('/news')
    await mockDelay()
    return store.read()
  },

  async get(id: string): Promise<NewsItem | undefined> {
    if (!USE_MOCK) return http<NewsItem>(`/news/${id}`)
    await mockDelay()
    return store.read().find((n) => n.id === id)
  },

  async create(item: NewsItem): Promise<NewsItem> {
    if (!USE_MOCK)
      return http<NewsItem>('/news', { method: 'POST', body: JSON.stringify(item) })
    await mockDelay()
    const list = store.read()
    const id = uniqueId(item.id?.trim() || slugify(item.title, 'news'), new Set(list.map((n) => n.id)))
    const created: NewsItem = { ...item, id }
    store.write([created, ...list])
    return created
  },

  async update(id: string, patch: Partial<NewsItem>): Promise<NewsItem> {
    if (!USE_MOCK)
      return http<NewsItem>(`/news/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    await mockDelay()
    const list = store.read()
    const next = list.map((n) => (n.id === id ? { ...n, ...patch, id } : n))
    store.write(next)
    return next.find((n) => n.id === id) as NewsItem
  },

  async remove(id: string): Promise<void> {
    if (!USE_MOCK) return http<void>(`/news/${id}`, { method: 'DELETE' })
    await mockDelay()
    store.write(store.read().filter((n) => n.id !== id))
  },

  /** Сброс к исходным демо-данным (только mock). */
  async reset(): Promise<NewsItem[]> {
    if (!USE_MOCK) return http<NewsItem[]>('/news/reset', { method: 'POST' })
    await mockDelay()
    return store.reset()
  },

  /**
   * Импорт новостей из Telegram-канала (http-режим). В mock-режиме источника
   * Telegram нет — возвращаем текущий список без изменений.
   */
  async sync(): Promise<{ ok: boolean; channel: string; synced: number }> {
    if (!USE_MOCK) return http('/news/sync', { method: 'POST' })
    await mockDelay()
    return { ok: true, channel: 'mock', synced: store.read().length }
  },

  // ---------- Комментарии ----------
  async listComments(newsId: string): Promise<NewsComment[]> {
    if (!USE_MOCK) return http<NewsComment[]>(`/news/${newsId}/comments`)
    await mockDelay()
    return readJson<NewsComment[]>(commentsKey(newsId), [])
  },

  async addComment(
    newsId: string,
    input: { author: string; body: string; userId?: string },
  ): Promise<NewsComment> {
    if (!USE_MOCK)
      return http<NewsComment>(`/news/${newsId}/comments`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    await mockDelay()
    const list = readJson<NewsComment[]>(commentsKey(newsId), [])
    const comment: NewsComment = {
      id: `c-${Date.now().toString(36)}`,
      newsId,
      userId: input.userId ?? null,
      author: input.author,
      body: input.body,
      createdAt: new Date().toISOString(),
    }
    writeJson(commentsKey(newsId), [...list, comment])
    return comment
  },

  async removeComment(newsId: string, commentId: string, userId?: string): Promise<void> {
    if (!USE_MOCK) {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : ''
      await http<void>(`/news/${newsId}/comments/${commentId}${q}`, { method: 'DELETE' })
      return
    }
    await mockDelay()
    const list = readJson<NewsComment[]>(commentsKey(newsId), [])
    writeJson(
      commentsKey(newsId),
      list.filter((c) => c.id !== commentId),
    )
  },

  // ---------- Реакции ----------
  async getReactions(newsId: string, userId?: string): Promise<NewsReactions> {
    if (!USE_MOCK) {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : ''
      return http<NewsReactions>(`/news/${newsId}/reactions${q}`)
    }
    await mockDelay()
    return aggregateReactions(readJson(reactionsKey(newsId), []), userId)
  },

  async toggleReaction(newsId: string, emoji: string, userId: string): Promise<NewsReactions> {
    if (!USE_MOCK)
      return http<NewsReactions>(`/news/${newsId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji, userId }),
      })
    await mockDelay()
    let raw = readJson<{ userId: string; emoji: string }[]>(reactionsKey(newsId), [])
    const idx = raw.findIndex((r) => r.userId === userId && r.emoji === emoji)
    raw = idx >= 0 ? raw.filter((_, i) => i !== idx) : [...raw, { userId, emoji }]
    writeJson(reactionsKey(newsId), raw)
    return aggregateReactions(raw, userId)
  },
}
