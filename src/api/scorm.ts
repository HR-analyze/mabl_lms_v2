import { scormStore } from '@/lib/scormStore'
import type { ScormPackage } from '@/lib/scormStore'

export type { ScormPackage } from '@/lib/scormStore'

/**
 * Ресурс «SCORM-пакеты».
 *
 * Загрузка и проигрывание реализованы на клиенте (Cache Storage + Service
 * Worker) — это работает в любом режиме. Серверный хостинг пакетов (распаковка
 * на бэкенде + объектное хранилище, напр. Vercel Blob) — следующий шаг; под него
 * на бэкенде уже есть таблица scorm_packages и эндпоинты GET/DELETE /admin/scorm.
 */
export const scormApi = {
  list(): Promise<ScormPackage[]> {
    return Promise.resolve(scormStore.list())
  },
  upload(file: File): Promise<ScormPackage> {
    return scormStore.upload(file)
  },
  remove(id: string): Promise<void> {
    return scormStore.remove(id)
  },
}
