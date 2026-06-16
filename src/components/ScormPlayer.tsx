import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from './ui/Icon'

/**
 * Плеер SCORM-пакетов (SCORM 1.2). Контент запускается в iframe, а на родительском
 * окне поднимается минимальный SCORM-runtime (`window.API`), который пакет находит
 * через `lms.js`. Прогресс/статус сохраняются в localStorage (демо-режим).
 *
 * В продакшене этот runtime заменяется на серверный трекинг (отправка cmi.* в API).
 */

type CmiData = Record<string, string>

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

function createApi(storageKey: string, studentName: string): Scorm12Api {
  const defaults: CmiData = {
    'cmi.core.student_id': 'u-001',
    'cmi.core.student_name': studentName,
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.lesson_mode': 'normal',
    'cmi.core.credit': 'credit',
    'cmi.core.entry': 'ab-initio',
    'cmi.core.score.raw': '',
    'cmi.suspend_data': '',
    'cmi.launch_data': '',
  }

  let data: CmiData = { ...defaults }
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) data = { ...defaults, ...(JSON.parse(raw) as CmiData) }
  } catch {
    /* игнорируем повреждённое состояние */
  }

  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      /* приватный режим / переполнение — не критично */
    }
    return 'true'
  }

  return {
    LMSInitialize: () => 'true',
    LMSFinish: persist,
    LMSGetValue: (key) => data[key] ?? '',
    LMSSetValue: (key, value) => {
      data[key] = value
      return 'true'
    },
    LMSCommit: persist,
    LMSGetLastError: () => '0',
    LMSGetErrorString: () => 'No error',
    LMSGetDiagnostic: () => '',
  }
}

interface ScormPlayerProps {
  /** URL точки входа SCORM (res/index.html). */
  src: string
  title: string
  /** Имя слушателя для cmi.core.student_name. */
  studentName?: string
  /** Ключ для сохранения прогресса. */
  storageKey: string
}

export function ScormPlayer({ src, title, studentName = 'Слушатель МАБЛ', storageKey }: ScormPlayerProps) {
  const [ready, setReady] = useState(false)
  const apiRef = useRef<Scorm12Api | null>(null)

  useEffect(() => {
    const api = createApi(storageKey, studentName)
    apiRef.current = api
    window.API = api
    setReady(true)
    return () => {
      if (window.API === api) delete window.API
    }
  }, [storageKey, studentName])

  return (
    <div className="overflow-hidden rounded-card border border-ink-10 bg-neft">
      <div className="flex items-center justify-between gap-3 border-b border-wisdom/10 px-4 py-2.5">
        <span className="truncate text-[0.72rem] uppercase tracking-wide text-wisdom/60">
          SCORM · {title}
        </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-[0.72rem] uppercase tracking-wide text-wisdom/70 hover:text-wisdom"
        >
          Открыть в новой вкладке <ArrowUpRight width={14} height={14} />
        </a>
      </div>
      <div className="relative aspect-video w-full bg-[#444c54]">
        {ready && (
          <iframe
            src={src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="fullscreen; autoplay"
            allowFullScreen
          />
        )}
      </div>
    </div>
  )
}
