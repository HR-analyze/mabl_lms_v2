import type { NewsItem } from '@/types'

/**
 * Новости академии.
 *
 * Демо-заглушки убраны: список наполняется из админ-панели
 * (раздел «Новости»), данные хранятся в localStorage (mock-режим).
 */
export const news: NewsItem[] = []

export const getNewsById = (id: string): NewsItem | undefined =>
  news.find((n) => n.id === id)
