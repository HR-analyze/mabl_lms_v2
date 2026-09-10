import LZString from 'lz-string'

/**
 * Вычисление прогресса из данных SCORM 1.2.
 *
 * В SCORM 1.2 нет отдельного поля «процент прохождения» (оно появилось только
 * в SCORM 2004 как cmi.progress_measure), поэтому промежуточный прогресс
 * приходится доставать из того, что пакет всё-таки присылает. Порядок
 * источников — от точного к грубому:
 *
 * 1. cmi.suspend_data. Пакеты iSpring кладут туда собственное состояние
 *    прохождения, и из него получается ровно та доля, которую пакет рисует в
 *    своей боковой панели, — то есть цифра на сайте совпадает с цифрой внутри
 *    окна тренинга. Форматов два, см. ниже.
 * 2. cmi.core.score.raw, нормализованный по score.max. Для курса без теста
 *    слайдовый iSpring кладёт туда тот же процент просмотра; если тест есть —
 *    это уже результат теста, но как оценка прогресса он всё равно лучше нуля.
 * 3. cmi.core.lesson_status: completed/passed — значит 100 %.
 *
 * Проценты округляются ВНИЗ: именно так считает сам пакет (94 % при 93,98 —
 * см. панель), а расхождение в большую сторону выглядело бы как обман.
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
 * Состояние слайдового плеера iSpring (классический экспорт презентации).
 *
 * Строка — сжатый LZString-ом JSON. Значимые поля: `V` — индексы всех слайдов
 * курса, `v` — индексы просмотренных. Остальное (таймлайны, ответы на вопросы)
 * нас не касается.
 */
interface ISpringSlideState {
  V?: unknown
  v?: unknown
}

/**
 * Состояние веб-курса iSpring (новый экспорт на React, `res/data-1.json`).
 *
 * Строка — обычный JSON, но с экранированными кавычками. Курс разбит на
 * страницы: `state.ps[i].p` — доля прохождения страницы от 0 до 1. Прогресс
 * курса пакет считает как среднее по страницам.
 */
interface ISpringPageState {
  state?: { ps?: unknown }
  ps?: unknown
}

/**
 * Ни один формат авторским средством не документирован, поэтому любое
 * расхождение трактуется как «прогресс отсюда не достать» — вызывающий код
 * уходит на следующий источник.
 */

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
 * Привести долю 0–1 к целым процентам, округляя ВНИЗ — так считает сам пакет.
 *
 * Эпсилон здесь не подгонка, а защита от двоичной арифметики: 2.9 / 10 в
 * IEEE-754 даёт 28.999999999999996, и честные 29 % превратились бы в 28.
 * На настоящую дробь (93,98 → 93) поправка такого размера не влияет.
 */
function toPercent(share: number): number {
  if (!Number.isFinite(share)) return 0
  return Math.min(100, Math.max(0, Math.floor(share * 100 + 1e-9)))
}

/** Разобрать объект из строки: сжатой LZString, обычной или экранированной. */
function parseSuspendObject(raw: string): Record<string, unknown> | null {
  const attempts: Array<() => unknown> = [
    // Слайдовый iSpring: LZString + JSON.
    () => {
      const json = LZString.decompressFromBase64(raw)
      return json ? JSON.parse(json) : null
    },
    // Веб-курс iSpring: JSON как есть.
    () => JSON.parse(raw),
    // Тот же JSON, но с экранированными кавычками: `{\"state\":…}`.
    // Обёртка в кавычки заставляет JSON.parse раскрыть экранирование.
    () => JSON.parse(JSON.parse(`"${raw}"`) as string),
  ]
  for (const attempt of attempts) {
    try {
      const value = attempt()
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>
      }
    } catch {
      // Пробуем следующий формат.
    }
  }
  return null
}

/** Доля просмотренных слайдов у классического слайдового пакета iSpring. */
function slidePercent(parsed: ISpringSlideState): number | null {
  const all = uniqueIndexes(parsed.V)
  const viewed = uniqueIndexes(parsed.v)
  if (!all || all.length === 0 || !viewed) return null

  // Считаем только те просмотренные слайды, которые есть в оглавлении: так
  // служебные записи не дают больше 100 %.
  const known = new Set(all)
  const seen = viewed.filter((index) => known.has(index)).length
  return toPercent(seen / all.length)
}

/** Средняя доля прохождения страниц у веб-курса iSpring. */
function pagePercent(parsed: ISpringPageState): number | null {
  const raw = parsed.state?.ps ?? parsed.ps
  if (!Array.isArray(raw) || raw.length === 0) return null

  let sum = 0
  for (const page of raw) {
    if (!page || typeof page !== 'object') return null
    const share = (page as { p?: unknown }).p
    // Страница без доли прохождения означает незнакомую разновидность формата,
    // а не нулевой прогресс: занижать цифру хуже, чем уйти на другой источник.
    if (typeof share !== 'number' || !Number.isFinite(share)) return null
    sum += Math.min(1, Math.max(0, share))
  }
  return toPercent(sum / raw.length)
}

/**
 * Доля прохождения (0–100) из cmi.suspend_data пакета iSpring — по слайдам или
 * по страницам, в зависимости от формата, — или null, если состояние пустое
 * либо устроено иначе.
 */
export function viewedPercentFromSuspendData(raw: string | undefined): number | null {
  if (!raw) return null
  const parsed = parseSuspendObject(raw)
  if (!parsed) return null
  return slidePercent(parsed as ISpringSlideState) ?? pagePercent(parsed as ISpringPageState)
}

/** Прогресс из оценки: score.raw, приведённый к процентам по score.max. */
function percentFromScore(data: CmiData): number | null {
  const raw = Number.parseFloat(data['cmi.core.score.raw'] ?? '')
  if (!Number.isFinite(raw)) return null
  const max = Number.parseFloat(data['cmi.core.score.max'] ?? '')
  const scale = Number.isFinite(max) && max > 0 ? max : 100
  return toPercent(raw / scale)
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
