import type { Course } from '@/types'
import { courses as seedCourses } from '@/data/courses'
import { USE_MOCK, http, mockDelay } from './config'

/**
 * Ресурс «Программы». Единственная точка доступа к курсам для всего приложения.
 * mock-реализация хранит данные в localStorage; http-реализация ходит на бэкенд.
 */

const STORAGE_KEY = 'mabl.courses.v2'

function readStore(): Course[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedCourses
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Course[]) : seedCourses
  } catch {
    return seedCourses
  }
}

function writeStore(list: Course[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/** Транслитерация заголовка в безопасный id-слаг. */
function slugify(value: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ' ': '-',
  }
  const base = value
    .toLowerCase()
    .split('')
    .map((ch) => (ch in map ? map[ch] : /[a-z0-9-]/.test(ch) ? ch : ''))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'course'
}

function uniqueId(desired: string, taken: Set<string>): string {
  let id = desired
  if (taken.has(id)) {
    let n = 2
    while (taken.has(`${id}-${n}`)) n += 1
    id = `${id}-${n}`
  }
  return id
}

export const coursesApi = {
  /**
   * Синхронный снимок для мгновенной отрисовки (только mock).
   * В http-режиме данные приходят асинхронно через list().
   */
  peek(): Course[] {
    return USE_MOCK ? readStore() : []
  },

  async list(): Promise<Course[]> {
    if (!USE_MOCK) return http<Course[]>('/courses')
    await mockDelay()
    return readStore()
  },

  async get(id: string): Promise<Course | undefined> {
    if (!USE_MOCK) return http<Course>(`/courses/${id}`)
    await mockDelay()
    return readStore().find((c) => c.id === id)
  },

  async create(course: Course): Promise<Course> {
    if (!USE_MOCK) return http<Course>('/courses', { method: 'POST', body: JSON.stringify(course) })
    await mockDelay()
    const list = readStore()
    const id = uniqueId(course.id?.trim() || slugify(course.title), new Set(list.map((c) => c.id)))
    const created: Course = { ...course, id }
    writeStore([...list, created])
    return created
  },

  async update(id: string, patch: Partial<Course>): Promise<Course> {
    if (!USE_MOCK)
      return http<Course>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    await mockDelay()
    const list = readStore()
    const next = list.map((c) => (c.id === id ? { ...c, ...patch, id } : c))
    writeStore(next)
    return next.find((c) => c.id === id) as Course
  },

  async remove(id: string): Promise<void> {
    if (!USE_MOCK) return http<void>(`/courses/${id}`, { method: 'DELETE' })
    await mockDelay()
    writeStore(readStore().filter((c) => c.id !== id))
  },

  /** Сброс к исходным демо-данным (только mock). */
  async reset(): Promise<Course[]> {
    if (!USE_MOCK) return http<Course[]>('/courses/reset', { method: 'POST' })
    await mockDelay()
    writeStore(seedCourses)
    return seedCourses
  },
}
