import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import type { Course, LessonProgress } from '@/types'

/**
 * Прогресс обучения текущего слушателя.
 *
 * Источник истины — сервер (GET/PUT /api/me/progress). Прогресс свой у каждого
 * слушателя, поэтому в записи программы (Course.progress, Lesson.completed) его
 * искать нельзя: та запись одна на всех и правится только из админки.
 *
 * Ключ карты — `courseId::lessonId`.
 */

interface ProgressContextValue {
  /** Загружается ли сводка по прогрессу. */
  loading: boolean
  /** Процент прохождения программы: среднее по её урокам, 0–100. */
  courseProgress: (course: Course) => number
  /** Прогресс конкретного урока, 0–100. */
  lessonProgress: (courseId: string, lessonId: string) => number
  /** Пройден ли урок. */
  isLessonDone: (courseId: string, lessonId: string) => boolean
  /** Записи по программе (с cmi.*, если их успели подгрузить через loadCourse). */
  courseLessons: (courseId: string) => LessonProgress[]
  /** Подтянуть прогресс программы вместе с состоянием SCORM для возобновления. */
  loadCourse: (courseId: string) => Promise<LessonProgress[]>
  /**
   * Отметить прогресс урока локально, без запроса к серверу.
   *
   * Нужен, чтобы цифра на странице менялась вместе с панелью внутри тренинга,
   * а не ждала отложенной отправки состояния (см. ScormPlayer).
   */
  noteLesson: (
    courseId: string,
    lessonId: string,
    status: { progress: number; status: string; completed: boolean },
  ) => void
  /** Сохранить прогресс урока на сервере и обновить локальную карту. */
  saveLesson: (
    courseId: string,
    lessonId: string,
    payload: { progress: number; status: string; completed: boolean; cmi: Record<string, string> },
  ) => Promise<void>
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

function keyOf(courseId: string, lessonId: string): string {
  return `${courseId}::${lessonId}`
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [entries, setEntries] = useState<Map<string, LessonProgress>>(new Map())
  const [loading, setLoading] = useState(false)
  // Прогресс принадлежит конкретному аккаунту: на общем компьютере данные
  // прежнего слушателя не должны пережить смену пользователя.
  const userId = user?.id

  const merge = useCallback((items: LessonProgress[]) => {
    setEntries((prev) => {
      const next = new Map(prev)
      for (const item of items) {
        const key = keyOf(item.courseId, item.lessonId)
        // cmi.* приходит только из выдачи по программе — при слиянии со
        // сводкой его нельзя терять, иначе пакету не с чего возобновиться.
        const before = next.get(key)
        next.set(key, { ...item, cmi: item.cmi ?? before?.cmi })
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setEntries(new Map())
      return
    }
    let active = true
    setLoading(true)
    api.progress
      .mine()
      .then((items) => {
        if (!active) return
        setEntries(new Map(items.map((i) => [keyOf(i.courseId, i.lessonId), i])))
      })
      // Сбой сети не должен ломать страницу: прогресс просто покажется нулевым
      // и подтянется при следующей загрузке.
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isAuthenticated, userId])

  // Значения читаются из свежей карты внутри колбэков, поэтому держим ссылку:
  // так saveLesson не пересоздаётся на каждое изменение прогресса.
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  const loadCourse = useCallback(
    async (courseId: string) => {
      if (!isAuthenticated) return []
      const items = await api.progress.forCourse(courseId)
      merge(items)
      return items
    },
    [isAuthenticated, merge],
  )

  const noteLesson = useCallback<ProgressContextValue['noteLesson']>(
    (courseId, lessonId, status) => {
      const key = keyOf(courseId, lessonId)
      const before = entriesRef.current.get(key)
      // Прогресс и признак завершения только растут — ровно как на сервере:
      // в начале нового сеанса пакет какое-то время рапортует нулями.
      const progress = Math.max(before?.progress ?? 0, status.progress)
      const completed = (before?.completed ?? false) || status.completed
      if (
        before &&
        before.progress === progress &&
        before.completed === completed &&
        before.status === status.status
      ) {
        return
      }
      setEntries((prev) => {
        const next = new Map(prev)
        next.set(key, {
          courseId,
          lessonId,
          progress: completed ? 100 : progress,
          status: status.status,
          completed,
          updatedAt: new Date().toISOString(),
          cmi: before?.cmi,
        })
        return next
      })
    },
    [],
  )

  const saveLesson = useCallback<ProgressContextValue['saveLesson']>(
    async (courseId, lessonId, payload) => {
      // Сервер возвращает уже согласованную запись (прогресс не уменьшается),
      // но cmi.* в ответе нет — держим отправленное состояние локально.
      const saved = await api.progress.saveLesson(courseId, lessonId, payload)
      merge([{ ...saved, cmi: payload.cmi }])
    },
    [merge],
  )

  const value = useMemo<ProgressContextValue>(() => {
    const get = (courseId: string, lessonId: string) => entries.get(keyOf(courseId, lessonId))
    return {
      loading,
      lessonProgress: (courseId, lessonId) => get(courseId, lessonId)?.progress ?? 0,
      isLessonDone: (courseId, lessonId) => get(courseId, lessonId)?.completed ?? false,
      courseLessons: (courseId) =>
        Array.from(entries.values()).filter((e) => e.courseId === courseId),
      // Прогресс программы — среднее по всем её урокам, а не максимум: иначе
      // один пройденный урок из десяти показывал бы курс завершённым.
      courseProgress: (course) => {
        const lessons = (course.modules ?? []).flatMap((m) => m.lessons ?? [])
        if (lessons.length === 0) return 0
        const sum = lessons.reduce((acc, l) => {
          const entry = get(course.id, l.id)
          if (!entry) return acc
          return acc + (entry.completed ? 100 : entry.progress)
        }, 0)
        return Math.min(100, Math.round(sum / lessons.length))
      },
      loadCourse,
      noteLesson,
      saveLesson,
    }
  }, [entries, loading, loadCourse, noteLesson, saveLesson])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress должен использоваться внутри ProgressProvider')
  return ctx
}
