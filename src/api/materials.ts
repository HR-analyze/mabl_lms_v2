import type { Material } from '@/types'
import { materials } from '@/data/materials'
import { USE_MOCK, http, mockDelay } from './config'

/** Ресурс «Учебные материалы». */
export const materialsApi = {
  async list(): Promise<Material[]> {
    if (!USE_MOCK) return http<Material[]>('/materials')
    await mockDelay()
    return materials
  },
  async get(id: string): Promise<Material | undefined> {
    if (!USE_MOCK) return http<Material>(`/materials/${id}`)
    await mockDelay()
    return materials.find((m) => m.id === id)
  },
}
