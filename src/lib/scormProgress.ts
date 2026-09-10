import LZString from 'lz-string'

/**
 * Вычисление прогресса из данных SCORM 1.2.
 *
 * В SCORM 1.2 нет отдельного поля «процент прохождения» (оно появилось только
 * в SCORM 2004 как cmi.progress_measure), поэтому промежуточный прогресс
 * приходится доставать из того, что пакет всё-таки присылает. Порядок
 * источников — от точного к грубому:
 *
 * 1. cmi.suspend_data. Пакеты iSpring (а это все наши тренинги) кладут туда
 *    сжатый JSON со списком слайдов курса и списком просмотренных. Это ровно
 *    та доля, которую сам пакет рисует в своей боковой панели, — то есть
 *    цифра на сайте совпадает с цифрой внутри окна тренинга.
 * 2. cmi.core.score.raw, нормализованный по score.max. Для курса без теста
 *    iSpring кладёт туда тот же процент просмотра; если тест есть — это уже
 *    результат теста, но как оценка прогресса он всё равно лучше нуля.
 * 3. cmi.core.lesson_status: completed/passed — значит 100 %.
 */

export type CmiData = Record<string, string>

export interface ScormStatus {
  /** cmi.core.lesson_status (completed/passed/incomplete/failed/…). */
  status: string
  /** cmi.core.score.raw, если задан. */
  score?: number
  /** Прогресс прохождения, 0–100. */
  progress: number
  completed: boolean
}

/** Статусы SCORM 1.2, означающие пройденный урок. */
const DONE_STATUSES = new Set(['completed', 'passed'])

/**
 * Разобранное состояние iSpring из cmi.suspend_data.
 *
 * Значимые поля: `V` — индексы всех слайдов курса, `v` — индексы просмотренных.
 * Остальное (таймлайны, ответы на вопросы) нас не касается. Формат авторским
 * средством не документирован, поэтому любые расхождения трактуются как
 * «прогресс отсюда не достать» — вызывающий код уходит на следующий источник.
 */
interface ISpringSuspendState {
  V?: unknown
  v?: unknown
}

function uniqueIndexes(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null
  const out = new Set<number>()
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isFinite(item)) continue
    out.add(item)
  }
  return Array.from(out)
}

/**
 * Доля просмотренных слайдов (0–100) из cmi.suspend_data пакета iSpring
 * или null, если состояние пустое либо устроено иначе.
 */
export function viewedPercentFromSuspendData(raw: string | undefined): number | null {
  if (!raw) return null
  let parsed: ISpringSuspendState
  try {
    const json = LZString.decompressFromBase64(raw)
    if (!json) return null
    const value = JSON.parse(json) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    parsed = value as ISpringSuspendState
  } catch {
    // Не наш формат (другое авторское средство или несжатая строка).
    return null
  }

  const all = uniqueIndexes(parsed.V)
  const viewed = uniqueIndexes(parsed.v)
  if (!all || all.length === 0 || !viewed) return null

  // Считаем только те просмотренные слайды, которые есть в оглавлении: так
  // служебные записи не дают больше 100 %.
  const known = new Set(all)
  const seen = viewed.filter((index) => known.has(index)).length
  return Math.min(100, Math.max(0, Math.round((seen / all.length) * 100)))
}

/** Прогресс из оценки: score.raw, приведённый к процентам по score.max. */
function percentFromScore(data: CmiData): number | null {
  const raw = Number.parseFloat(data['cmi.core.score.raw'] ?? '')
  if (!Number.isFinite(raw)) return null
  const max = Number.parseFloat(data['cmi.core.score.max'] ?? '')
  const scale = Number.isFinite(max) && max > 0 ? max : 100
  return Math.min(100, Math.max(0, Math.round((raw / scale) * 100)))
}

/** Свести данные SCORM к статусу и проценту для интерфейса сайта. */
export function computeStatus(data: CmiData): ScormStatus {
  const status = data['cmi.core.lesson_status'] || 'not attempted'
  const rawScore = Number.parseFloat(data['cmi.core.score.raw'] ?? '')
  const completed = DONE_STATUSES.has(status)

  const measured = viewedPercentFromSuspendData(data['cmi.suspend_data']) ?? percentFromScore(data)
  const progress = completed ? 100 : (measured ?? 0)

  return {
    status,
    score: Number.isFinite(rawScore) ? rawScore : undefined,
    progress,
    completed,
  }
}

/** Одинаковы ли два статуса с точки зрения интерфейса. */
export function sameStatus(a: ScormStatus, b: ScormStatus): boolean {
  return (
    a.status === b.status &&
    a.progress === b.progress &&
    a.completed === b.completed &&
    a.score === b.score
  )
}
