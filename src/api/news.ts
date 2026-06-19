import type { NewsItem } from '@/types'
import { news as seedNews } from '@/data/news'
import { USE_MOCK, http, mockDelay } from './config'
import { makeStore, slugify, uniqueId } from './_store'

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
}
