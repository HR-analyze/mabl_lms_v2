import { API_URL, USE_MOCK, http } from './config'
import { scormStore } from '@/lib/scormStore'
import type { ScormPackage } from '@/lib/scormStore'

export type { ScormPackage } from '@/lib/scormStore'

/**
 * Ресурс «SCORM-пакеты».
 * mock — распаковка и хранение в браузере (Cache Storage + Service Worker);
 * http — загрузка на бэкенд, который распаковывает и хостит пакет.
 */
export const scormApi = {
  async list(): Promise<ScormPackage[]> {
    if (!USE_MOCK) return http<ScormPackage[]>('/admin/scorm')
    return scormStore.list()
  },

  async upload(file: File): Promise<ScormPackage> {
    if (!USE_MOCK) {
      const form = new FormData()
      form.append('package', file)
      const res = await fetch(`${API_URL}/admin/scorm`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Ошибка загрузки (${res.status})`)
      return (await res.json()) as ScormPackage
    }
    return scormStore.upload(file)
  },

  async remove(id: string): Promise<void> {
    if (!USE_MOCK) return http<void>(`/admin/scorm/${id}`, { method: 'DELETE' })
    return scormStore.remove(id)
  },
}
