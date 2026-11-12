import { http } from './config'

/**
 * Ресурс «Обратная связь»: оценка 1–5 и необязательный отзыв о программе или
 * курсе. У слушателя один отзыв на объект — повторная отправка его правит.
 */

/** Что оценивают: курс из каталога (БД) или программу-лендинг. */
export type FeedbackTarget = 'course' | 'program'

export interface Feedback {
  targetType: FeedbackTarget
  targetId: string
  userId: string
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
}

/** Отзыв в админке — с автором. */
export interface FeedbackEntry extends Feedback {
  userName: string | null
  userEmail: string | null
}

export interface MyFeedback {
  /** Можно ли этому аккаунту оценивать (у курса — только при открытом доступе). */
  canRate: boolean
  reason?: string
  mine: Feedback | null
}

const path = (type: FeedbackTarget, id: string) =>
  `/feedback/${type}/${encodeURIComponent(id)}`

export const feedbackApi = {
  /** Свой отзыв и право оценивать. */
  mine(type: FeedbackTarget, id: string): Promise<MyFeedback> {
    return http<MyFeedback>(path(type, id))
  },

  /** Оставить или поправить свой отзыв. */
  save(type: FeedbackTarget, id: string, payload: { rating: number; comment: string }): Promise<Feedback> {
    return http<Feedback>(path(type, id), { method: 'PUT', body: JSON.stringify(payload) })
  },

  /** Админка: все отзывы. */
  async list(): Promise<FeedbackEntry[]> {
    const res = await http<{ feedback: FeedbackEntry[] }>('/admin/feedback')
    return res.feedback ?? []
  },

  /** Админка: удалить отзыв. */
  remove(entry: Pick<Feedback, 'targetType' | 'targetId' | 'userId'>): Promise<void> {
    return http<void>(
      `/admin/feedback/${entry.targetType}/${encodeURIComponent(entry.targetId)}/${encodeURIComponent(entry.userId)}`,
      { method: 'DELETE' },
    )
  },
}
