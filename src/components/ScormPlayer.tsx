import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from './ui/Icon'
import { cn, displayTitle } from '@/lib/utils'
import { computeStatus, sameStatus } from '@/lib/scormProgress'
import type { CmiData, ScormStatus } from '@/lib/scormProgress'

/**
 * Плеер SCORM-пакетов (SCORM 1.2). Контент запускается в iframe, а на
 * родительском окне поднимается минимальный SCORM-runtime (`window.API`),
 * который пакет находит через `lms.js`.
 *
 * Состояние прохождения (cmi.*) уходит НА СЕРВЕР через onPersist — оттуда же
 * оно приезжает при следующем запуске (initialCmi), поэтому тренинг
 * продолжается с того же места на любом устройстве. localStorage остался
 * быстрым локальным кэшем: он отдаёт состояние мгновенно и переживает обрыв
 * связи, но источник истины — сервер.
 */

export type { ScormStatus } from '@/lib/scormProgress'

interface Scorm12Api {
  LMSInitialize: () => string
  LMSFinish: () => string
  LMSGetValue: (key: string) => string
  LMSSetValue: (key: string, value: string) => string
  LMSCommit: () => string
  LMSGetLastError: () => string
  LMSGetErrorString: () => string
  LMSGetDiagnostic: () => string
}

declare global {
  interface Window {
    API?: Scorm12Api
  }
}

/** Пауза перед отправкой состояния на сервер: пакет пишет cmi.* очередями. */
const SERVER_SYNC_DELAY_MS = 4000

/** Ключи, которые по стандарту задаёт LMS, а не пакет. */
function lmsDefaults(studentId: string, studentName: string): CmiData {
  return {
    'cmi.core.student_id': studentId,
    'cmi.core.student_name': studentName,
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.lesson_mode': 'normal',
    'cmi.core.credit': 'credit',
    'cmi.core.entry': 'ab-initio',
    'cmi.core.score.raw': '',
    'cmi.suspend_data': '',
    'cmi.launch_data': '',
  }
}

function readCache(storageKey: string): CmiData | null {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as CmiData) : null
  } catch {
    // Повреждённое состояние или приватный режим — просто нет кэша.
    return null
  }
}

function writeCache(storageKey: string, data: CmiData): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data))
  } catch {
    /* приватный режим / переполнение — не критично, состояние есть на сервере */
  }
}

/**
 * Выбрать состояние для запуска: серверное, если оно новее или полнее.
 *
 * Сравниваем по объёму cmi.suspend_data — именно там лежит вся история
 * просмотра, и более длинная строка означает более далеко продвинутое
 * прохождение. Так возврат с другого устройства не откатывает прогресс к тому,
 * что осталось в кэше этого браузера.
 */
function pickState(cached: CmiData | null, remote: CmiData | undefined): CmiData | null {
  if (!remote) return cached
  if (!cached) return remote
  const localLength = (cached['cmi.suspend_data'] ?? '').length
  const remoteLength = (remote['cmi.suspend_data'] ?? '').length
  return remoteLength >= localLength ? remote : cached
}

interface ScormPlayerProps {
  /** URL точки входа SCORM (res/index.html). */
  src: string
  title: string
  /** Идентификатор слушателя для cmi.core.student_id. */
  studentId?: string
  /** Имя слушателя для cmi.core.student_name. */
  studentName?: string
  /**
   * Ключ локального кэша состояния. Должен включать идентификатор слушателя:
   * на общем компьютере иначе следующий вошедший увидит чужой прогресс.
   */
  storageKey: string
  /** Сохранённое на сервере состояние SCORM (cmi.*) этого слушателя. */
  initialCmi?: CmiData
  /**
   * Загружено ли серверное состояние. Пока false, пакет не запускается: если
   * дать ему стартовать с пустым cmi.suspend_data, он тут же перезапишет
   * сохранённое прохождение своим «с нуля».
   */
  stateReady?: boolean
  /** Колбэк при изменении статуса/прогресса SCORM. */
  onStatus?: (status: ScormStatus) => void
  /** Сохранить состояние на сервере (вызывается редко: на commit и при уходе). */
  onPersist?: (cmi: CmiData, status: ScormStatus) => void
}

export function ScormPlayer({
  src,
  title,
  studentId = 'guest',
  studentName = 'Слушатель',
  storageKey,
  initialCmi,
  stateReady = true,
  onStatus,
  onPersist,
}: ScormPlayerProps) {
  const [running, setRunning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Колбэки читаются через ref: их пересоздание на каждый рендер не должно
  // перезапускать SCORM-сеанс и перезагружать iframe.
  const onStatusRef = useRef(onStatus)
  onStatusRef.current = onStatus
  const onPersistRef = useRef(onPersist)
  onPersistRef.current = onPersist

  // Серверное состояние берётся один раз — на старте сеанса. Дальше источником
  // истины становится сам пакет, и подмена состояния под работающим пакетом
  // только сломала бы прохождение.
  const initialCmiRef = useRef(initialCmi)
  initialCmiRef.current = initialCmi

  useEffect(() => {
    if (!stateReady) return

    const defaults = lmsDefaults(studentId, studentName)
    const restored = pickState(readCache(storageKey), initialCmiRef.current)
    const data: CmiData = { ...defaults, ...(restored ?? {}) }
    // Имя и идентификатор берём от текущего аккаунта, а не из сохранённого
    // состояния: оно могло быть записано под прежним именем слушателя.
    data['cmi.core.student_id'] = studentId
    data['cmi.core.student_name'] = studentName
    // Незавершённое прохождение продолжаем, а не начинаем заново: по стандарту
    // об этом пакету сообщает именно cmi.core.entry.
    data['cmi.core.entry'] = data['cmi.suspend_data'] ? 'resume' : 'ab-initio'

    let lastStatus = computeStatus(data)
    let syncTimer: ReturnType<typeof setTimeout> | undefined
    let dirty = false
    let finished = false

    const pushToServer = () => {
      if (syncTimer) {
        clearTimeout(syncTimer)
        syncTimer = undefined
      }
      if (!dirty) return
      dirty = false
      onPersistRef.current?.({ ...data }, computeStatus(data))
    }

    const scheduleServerSync = () => {
      dirty = true
      if (syncTimer) return
      syncTimer = setTimeout(() => {
        syncTimer = undefined
        pushToServer()
      }, SERVER_SYNC_DELAY_MS)
    }

    /** Сообщить наверх, если статус или процент действительно изменились. */
    const emit = () => {
      const next = computeStatus(data)
      if (sameStatus(next, lastStatus)) return
      lastStatus = next
      onStatusRef.current?.(next)
    }

    const api: Scorm12Api = {
      LMSInitialize: () => 'true',
      LMSFinish: () => {
        finished = true
        writeCache(storageKey, data)
        emit()
        pushToServer()
        return 'true'
      },
      LMSGetValue: (key) => data[key] ?? '',
      LMSSetValue: (key, value) => {
        if (typeof key !== 'string' || !key.startsWith('cmi.')) return 'false'
        data[key] = String(value)
        // Пакет пишет cmi.* пачками; в localStorage это дёшево, поэтому кэш
        // обновляем сразу, а серверу отправляем отложенно.
        writeCache(storageKey, data)
        scheduleServerSync()
        emit()
        return 'true'
      },
      LMSCommit: () => {
        writeCache(storageKey, data)
        emit()
        // Commit — явная просьба пакета сохраниться: не откладываем.
        pushToServer()
        return 'true'
      },
      LMSGetLastError: () => '0',
      LMSGetErrorString: () => 'No error',
      LMSGetDiagnostic: () => '',
    }

    window.API = api
    setRunning(true)
    onStatusRef.current?.(lastStatus)

    // Уход со страницы или сворачивание вкладки: пакет успевает вызвать
    // LMSFinish не всегда, поэтому дожимаем сохранение сами.
    const flush = () => {
      if (finished) return
      writeCache(storageKey, data)
      pushToServer()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)

    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
      flush()
      if (syncTimer) clearTimeout(syncTimer)
      if (window.API === api) delete window.API
      setRunning(false)
    }
  }, [storageKey, studentId, studentName, stateReady])

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void wrapRef.current?.requestFullscreen()
  }, [])

  return (
    <div
      ref={wrapRef}
      className={cn(
        'overflow-hidden border border-ink-10 bg-neft',
        isFullscreen ? 'flex h-full w-full flex-col' : 'rounded-card',
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-wisdom/10 px-4 py-2.5">
        <span className="truncate text-[0.72rem] uppercase tracking-wide text-wisdom/60">
          {displayTitle(title)}
        </span>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wide text-wisdom/70 hover:text-wisdom"
          >
            {isFullscreen ? 'Свернуть' : 'На весь экран'}
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wide text-wisdom/70 hover:text-wisdom"
          >
            Открыть в новой вкладке <ArrowUpRight width={14} height={14} />
          </a>
        </div>
      </div>
      <div className={cn('relative w-full bg-[#444c54]', isFullscreen ? 'flex-1' : 'aspect-video')}>
        {running ? (
          <iframe
            src={src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="fullscreen; autoplay"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-wisdom/60">
            Загружаем ваш прогресс…
          </div>
        )}
      </div>
    </div>
  )
}
