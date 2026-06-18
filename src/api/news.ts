import type { NewsItem } from '@/types'
import { news } from '@/data/news'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «Новости». */
export const newsApi = {
  async list(): Promise<NewsItem[]> {
    if (!USE_MOCK) return http<NewsItem[]>('/news')
    await mockDelay()
    return news
  },
  async get(id: string): Promise<NewsItem | undefined> {
    if (!USE_MOCK) return http<NewsItem>(`/news/${id}`)
    await mockDelay()
    return news.find((n) => n.id === id)
  },
}
