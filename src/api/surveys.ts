import type { Survey } from '@/types'
import { surveys } from '@/data/surveys'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «Опросники». */
export const surveysApi = {
  async list(): Promise<Survey[]> {
    if (!USE_MOCK) return http<Survey[]>('/surveys')
    await mockDelay()
    return surveys
  },
  async get(id: string): Promise<Survey | undefined> {
    if (!USE_MOCK) return http<Survey>(`/surveys/${id}`)
    await mockDelay()
    return surveys.find((s) => s.id === id)
  },
}
