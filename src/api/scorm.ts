import { scormStore } from '@/lib/scormStore'
import type { ScormPackage } from '@/lib/scormStore'

export type { ScormPackage } from '@/lib/scormStore'

/**
 * Ресурс «SCORM-пакеты».
 *
 * Пакеты обрабатываются ТОЛЬКО на клиенте (Cache Storage + Service Worker,
 * см. src/lib/scormStore.ts) независимо от режима API. SCORM-пакет — это
 * статика, которую браузер проигрывает напрямую, поэтому гонять его через
 * бэкенд незачем. Кроме того, загрузка через серверную функцию невозможна:
 * Vercel ограничивает тело запроса 4.5 МБ и возвращает 413 на типичных
 * SCORM-архивах, а серверной распаковки/хостинга в API нет.
 */
export const scormApi = {
  async list(): Promise<ScormPackage[]> {
    return scormStore.list()
  },

  async upload(file: File): Promise<ScormPackage> {
    return scormStore.upload(file)
  },

  async remove(id: string): Promise<void> {
    return scormStore.remove(id)
  },
}
