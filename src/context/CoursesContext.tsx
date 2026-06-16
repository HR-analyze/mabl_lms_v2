import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Course } from '@/types'
import { courses as seedCourses } from '@/data/courses'

/**
 * Редактируемый каталог программ. Источник истины для всего приложения:
 * каталог, главная, личный кабинет и админ-панель читают курсы отсюда.
 *
 * Демо-хранилище — localStorage (правки сохраняются между перезагрузками).
 * В продакшене заменяется на API (GET/POST/PUT/DELETE /courses).
 */

const STORAGE_KEY = 'mabl.courses.v1'

interface CoursesContextValue {
  courses: Course[]
  getCourseById: (id: string) => Course | undefined
  /** Создать новую программу. Возвращает присвоенный id. */
  addCourse: (course: Course) => string
  /** Обновить поля существующей программы. */
  updateCourse: (id: string, patch: Partial<Course>) => void
  /** Удалить программу. */
  deleteCourse: (id: string) => void
  /** Вернуть каталог к исходным демо-данным. */
  resetCourses: () => void
}

const CoursesContext = createContext<CoursesContextValue | null>(null)

function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedCourses
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Course[]) : seedCourses
  } catch {
    return seedCourses
  }
}

/** Транслитерация заголовка в безопасный id-слаг для новых программ. */
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

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(loadCourses)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses))
  }, [courses])

  const addCourse = (course: Course): string => {
    // Гарантируем уникальность id (на основе слага заголовка).
    let id = course.id?.trim() || slugify(course.title)
    const existing = new Set(courses.map((c) => c.id))
    if (existing.has(id)) {
      let n = 2
      while (existing.has(`${id}-${n}`)) n += 1
      id = `${id}-${n}`
    }
    const created: Course = { ...course, id }
    setCourses((prev) => [...prev, created])
    return id
  }

  const updateCourse = (id: string, patch: Partial<Course>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, id } : c)))
  }

  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id))
  }

  const resetCourses = () => setCourses(seedCourses)

  const value = useMemo<CoursesContextValue>(
    () => ({
      courses,
      getCourseById: (id) => courses.find((c) => c.id === id),
      addCourse,
      updateCourse,
      deleteCourse,
      resetCourses,
    }),
    [courses],
  )

  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourses(): CoursesContextValue {
  const ctx = useContext(CoursesContext)
  if (!ctx) throw new Error('useCourses должен использоваться внутри CoursesProvider')
  return ctx
}
