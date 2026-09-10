import { http } from './config'
import type { LessonProgress } from '@/types'

/**
 * Ресурс «Прогресс обучения».
 *
 * Прогресс СВОЙ у каждого слушателя и хранится на сервере — вместе с сырым
 * состоянием SCORM (cmi.*). Благодаря этому обучение продолжается с того же
 * места на другом устройстве, а прогресс одного слушателя не виден остальным.
 *
 * Раньше прогресс писался прямо в запись программы (PUT /courses/:id): один
 * набор чисел на всех, да ещё и за админским гардом — то есть у слушателя он
 * не сохранялся вовсе.
 */
export const progressApi = {
  /** Сводка по всем программам (без cmi.* — оно тяжёлое и нужно только в плеере). */
  async mine(): Promise<LessonProgress[]> {
    const res = await http<{ lessons: LessonProgress[] }>('/me/progress')
    return res.lessons ?? []
  },

  /** Прогресс по одной программе вместе с состоянием SCORM для возобновления. */
  async forCourse(courseId: string): Promise<LessonProgress[]> {
    const res = await http<{ lessons: LessonProgress[] }>(
      `/me/progress/${encodeURIComponent(courseId)}`,
    )
    return res.lessons ?? []
  },

  /** Сохранить прогресс урока. Сервер не даёт прогрессу уменьшиться. */
  async saveLesson(
    courseId: string,
    lessonId: string,
    payload: { progress: number; status: string; completed: boolean; cmi: Record<string, string> },
  ): Promise<LessonProgress> {
    return http<LessonProgress>(
      `/me/progress/${encodeURIComponent(courseId)}/${encodeURIComponent(lessonId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
    )
  },
}
