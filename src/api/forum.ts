import type { ForumSection, ForumTopic } from '@/types'
import { forumSections, forumTopics } from '@/data/forum'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «Форум». */
export const forumApi = {
  async listSections(): Promise<ForumSection[]> {
    if (!USE_MOCK) return http<ForumSection[]>('/forum/sections')
    await mockDelay()
    return forumSections
  },
  async listTopics(): Promise<ForumTopic[]> {
    if (!USE_MOCK) return http<ForumTopic[]>('/forum/topics')
    await mockDelay()
    return forumTopics
  },
  async getTopic(id: string): Promise<ForumTopic | undefined> {
    if (!USE_MOCK) return http<ForumTopic>(`/forum/topics/${id}`)
    await mockDelay()
    return forumTopics.find((t) => t.id === id)
  },
  async getSection(id: string): Promise<ForumSection | undefined> {
    if (!USE_MOCK) return http<ForumSection>(`/forum/sections/${id}`)
    await mockDelay()
    return forumSections.find((s) => s.id === id)
  },
}
