import { http } from './config'

/**
 * Ресурс «Выданный доступ».
 *
 * Открывает программу слушателю без оплаты — для внутренних: сотрудников,
 * преподавателей, тестировщиков. Хранится отдельно от заказов, чтобы служебные
 * выдачи не попадали в выручку и отчёты по продажам.
 */

/** Программа, открытая слушателю вручную. */
export interface CourseGrant {
  userId: string
  courseId: string
  /** Зачем выдан — «тестировщик», «преподаватель» и т. п. */
  note: string
  createdAt: string
}

export const grantsApi = {
  /** Все выдачи — для списка аккаунтов в админке. */
  async list(): Promise<CourseGrant[]> {
    const res = await http<{ grants: CourseGrant[] }>('/admin/grants')
    return res.grants ?? []
  },

  /**
   * Заменить набор программ, открытых слушателю. Это замена, а не добавление:
   * снятая галочка забирает доступ.
   */
  async replace(userId: string, courseIds: string[], note = ''): Promise<CourseGrant[]> {
    const res = await http<{ grants: CourseGrant[] }>(
      `/admin/grants/${encodeURIComponent(userId)}`,
      { method: 'PUT', body: JSON.stringify({ courseIds, note }) },
    )
    return res.grants ?? []
  },
}
