import { scormStore } from '@/lib/scormStore'
import type { ScormPackage, UploadProgress } from '@/lib/scormStore'
import { http } from '@/api/config'

export type { ScormPackage } from '@/lib/scormStore'

/** Результат серверной диагностики пакета (см. api/router.ts). */
export interface ScormDiagnostics {
  id: string
  /** Как проверялся доступ к файлам: 'none' — хранилище не настроено. */
  mode: string
  /** Где лежат файлы — человекочитаемо (диск ВМ или имя бакета). */
  storage?: string
  fileCount: number
  okCount: number
  failed: Array<{ path: string; sizeKb: number; via: string; status: number | string }>
  listError?: string
  tookMs: number
}

/**
 * Ресурс «SCORM-пакеты».
 *
 * Файлы пакета распаковываются в браузере и уходят на наш API, который
 * кладёт их в хранилище; метаданные пакета хранятся в общей БД. Отдаются
 * файлы через наш домен (/scorm-store/<id>/...) — после проверки доступа,
 * поэтому пакет доступен со всех устройств, но только тем, кому открыт курс.
 * Подробности — src/lib/scormStore.ts и api/router.ts.
 */
export const scormApi = {
  async list(): Promise<ScormPackage[]> {
    return scormStore.list()
  },

  async upload(
    file: File,
    onProgress?: UploadProgress,
    confirmReplace?: (id: string) => boolean,
  ): Promise<ScormPackage> {
    return scormStore.upload(file, onProgress, confirmReplace)
  },

  async remove(id: string): Promise<void> {
    return scormStore.remove(id)
  },

  /** Проверить на сервере, какие файлы пакета реально отдаются. */
  async diagnose(id: string): Promise<ScormDiagnostics> {
    return http<ScormDiagnostics>(`/scorm/${encodeURIComponent(id)}/diagnose`)
  },
}
