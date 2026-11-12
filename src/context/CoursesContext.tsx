import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Course } from '@/types'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'

/**
 * Каталог программ — источник истины для всего приложения (каталог, главная,
 * кабинет, админка). Все операции идут через слой данных `api.courses`.
 *
 * Для мгновенной отрисовки состояние инициализируется синхронным снимком
 * (`peek`), а затем синхронизируется асинхронным `list()`.
 */

interface CoursesContextValue {
  courses: Course[]
  loading: boolean
  getCourseById: (id: string) => Course | undefined
  /** Перечитать каталог (например, после того как изменился доступ). */
  refresh: () => Promise<Course[]>
  addCourse: (course: Course) => Promise<string>
  updateCourse: (id: string, patch: Partial<Course>) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
}

const CoursesContext = createContext<CoursesContextValue | null>(null)

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(() => api.courses.peek())
  const [loading, setLoading] = useState(true)
  const { user, restoring } = useAuth()
  const userId = user?.id
  // Номер последнего запроса: ответ на устаревший (например, гостевой,
  // пришедший уже после входа) не должен затереть свежий каталог.
  const requestRef = useRef(0)

  const refresh = useCallback(async () => {
    const request = ++requestRef.current
    const list = await api.courses.list()
    if (request === requestRef.current) setCourses(list)
    return list
  }, [])

  // Ссылки запуска уроков сервер отдаёт только тем, кому программа доступна.
  // Раньше каталог грузился один раз при открытии сайта: вошедший после этого
  // слушатель видел «Обучение», но без ссылки на пакет — пустую заглушку
  // «Материалы появятся здесь после публикации». Поэтому перечитываем каталог
  // при входе и выходе; пока сессия сверяется, ждём — иначе запрос уйдёт со
  // старым токеном.
  useEffect(() => {
    if (restoring) return
    let active = true
    setLoading(true)
    refresh()
      .catch(() => undefined)
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [userId, restoring, refresh])

  const addCourse = async (course: Course): Promise<string> => {
    const created = await api.courses.create(course)
    await refresh()
    return created.id
  }

  const updateCourse = async (id: string, patch: Partial<Course>) => {
    await api.courses.update(id, patch)
    await refresh()
  }

  const deleteCourse = async (id: string) => {
    await api.courses.remove(id)
    await refresh()
  }

  const value = useMemo<CoursesContextValue>(
    () => ({
      courses,
      loading,
      getCourseById: (id) => courses.find((c) => c.id === id),
      refresh,
      addCourse,
      updateCourse,
      deleteCourse,
    }),
    [courses, loading, refresh],
  )

  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourses(): CoursesContextValue {
  const ctx = useContext(CoursesContext)
  if (!ctx) throw new Error('useCourses должен использоваться внутри CoursesProvider')
  return ctx
}
