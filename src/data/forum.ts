import type { ForumSection, ForumTopic } from '@/types'

/**
 * Форум академии: разделы и темы.
 *
 * Демо-заглушки убраны: разделы и обсуждения создаются из админ-панели
 * (раздел «Форум»), данные хранятся в localStorage (mock-режим).
 */
export const forumSections: ForumSection[] = []

export const forumTopics: ForumTopic[] = []

export const getTopicById = (id: string): ForumTopic | undefined =>
  forumTopics.find((t) => t.id === id)

export const getSectionById = (id: string): ForumSection | undefined =>
  forumSections.find((s) => s.id === id)
