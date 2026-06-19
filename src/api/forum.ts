import type { ForumSection, ForumTopic } from '@/types'
import { forumSections as seedSections, forumTopics as seedTopics } from '@/data/forum'
import { USE_MOCK, http, mockDelay } from './config'
import { makeStore, slugify, uniqueId } from './_store'

/**
 * Ресурс «Форум»: разделы и темы. Источник истины для публичного раздела и
 * админ-панели. mock-реализация хранит данные в localStorage.
 */

const sectionsStore = makeStore<ForumSection>('mabl.forum.sections.v1', seedSections)
const topicsStore = makeStore<ForumTopic>('mabl.forum.topics.v1', seedTopics)

/** Счётчик тем раздела считаем по фактическим темам — всегда актуально. */
function withCounts(sections: ForumSection[], topics: ForumTopic[]): ForumSection[] {
  return sections.map((s) => ({
    ...s,
    topicsCount: topics.filter((t) => t.sectionId === s.id).length,
  }))
}

export const forumApi = {
  async listSections(): Promise<ForumSection[]> {
    if (!USE_MOCK) return http<ForumSection[]>('/forum/sections')
    await mockDelay()
    return withCounts(sectionsStore.read(), topicsStore.read())
  },

  async listTopics(): Promise<ForumTopic[]> {
    if (!USE_MOCK) return http<ForumTopic[]>('/forum/topics')
    await mockDelay()
    return topicsStore.read()
  },

  async getTopic(id: string): Promise<ForumTopic | undefined> {
    if (!USE_MOCK) return http<ForumTopic>(`/forum/topics/${id}`)
    await mockDelay()
    return topicsStore.read().find((t) => t.id === id)
  },

  async getSection(id: string): Promise<ForumSection | undefined> {
    if (!USE_MOCK) return http<ForumSection>(`/forum/sections/${id}`)
    await mockDelay()
    return withCounts(sectionsStore.read(), topicsStore.read()).find((s) => s.id === id)
  },

  // ---------- Разделы (CRUD) ----------
  async createSection(section: ForumSection): Promise<ForumSection> {
    if (!USE_MOCK)
      return http<ForumSection>('/forum/sections', { method: 'POST', body: JSON.stringify(section) })
    await mockDelay()
    const list = sectionsStore.read()
    const id = uniqueId(section.id?.trim() || slugify(section.title, 'section'), new Set(list.map((s) => s.id)))
    const created: ForumSection = { ...section, id, topicsCount: 0 }
    sectionsStore.write([...list, created])
    return created
  },

  async updateSection(id: string, patch: Partial<ForumSection>): Promise<ForumSection> {
    if (!USE_MOCK)
      return http<ForumSection>(`/forum/sections/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    await mockDelay()
    const list = sectionsStore.read()
    const next = list.map((s) => (s.id === id ? { ...s, ...patch, id } : s))
    sectionsStore.write(next)
    return next.find((s) => s.id === id) as ForumSection
  },

  async removeSection(id: string): Promise<void> {
    if (!USE_MOCK) return http<void>(`/forum/sections/${id}`, { method: 'DELETE' })
    await mockDelay()
    sectionsStore.write(sectionsStore.read().filter((s) => s.id !== id))
    // Темы удалённого раздела тоже убираем, чтобы не «висели» без раздела.
    topicsStore.write(topicsStore.read().filter((t) => t.sectionId !== id))
  },

  // ---------- Темы (CRUD) ----------
  async createTopic(topic: ForumTopic): Promise<ForumTopic> {
    if (!USE_MOCK)
      return http<ForumTopic>('/forum/topics', { method: 'POST', body: JSON.stringify(topic) })
    await mockDelay()
    const list = topicsStore.read()
    const id = uniqueId(topic.id?.trim() || slugify(topic.title, 'topic'), new Set(list.map((t) => t.id)))
    const created: ForumTopic = { ...topic, id, comments: topic.comments ?? [] }
    topicsStore.write([created, ...list])
    return created
  },

  async updateTopic(id: string, patch: Partial<ForumTopic>): Promise<ForumTopic> {
    if (!USE_MOCK)
      return http<ForumTopic>(`/forum/topics/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    await mockDelay()
    const list = topicsStore.read()
    const next = list.map((t) => (t.id === id ? { ...t, ...patch, id } : t))
    topicsStore.write(next)
    return next.find((t) => t.id === id) as ForumTopic
  },

  async removeTopic(id: string): Promise<void> {
    if (!USE_MOCK) return http<void>(`/forum/topics/${id}`, { method: 'DELETE' })
    await mockDelay()
    topicsStore.write(topicsStore.read().filter((t) => t.id !== id))
  },

  /** Сброс форума к исходным демо-данным (только mock). */
  async reset(): Promise<void> {
    if (!USE_MOCK) {
      await http('/forum/reset', { method: 'POST' })
      return
    }
    await mockDelay()
    sectionsStore.reset()
    topicsStore.reset()
  },
}
