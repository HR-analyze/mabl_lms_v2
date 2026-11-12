import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { PassThrough, Readable } from 'node:stream'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { getSql } from './_db.js'
import type { Sql } from './_db.js'
import { env } from './_env.js'
import type { StoredObject } from './_storage.js'

/**
 * Бэкенд хранилища на RelaxDEV Storage API (https://relaxdev.ru/docs, раздел
 * «Хранилище и API»). Включается переменной STORAGE_API_KEY: платформа сама
 * кладёт её в переменные проекта по кнопке «Сгенерировать ключ» в менеджере
 * файлов.
 *
 * Почему не просто диск: постоянных дисков у платформы нет, файловая система
 * контейнера стирается при каждом деплое — так и пропадали SCORM-пакеты.
 *
 * Особенности API, из-за которых нужен слой соответствия:
 * - имя файла платформа выбирает сама (дописывает метку времени), поэтому
 *   адрес из нашего ключа не вычислить — пара «ключ → путь и ссылка» хранится в
 *   таблице storage_objects;
 * - картинки по умолчанию пережимаются в WebP — отключаем (webp=false), иначе
 *   поломались бы ссылки внутри SCORM-пакетов;
 * - файлы открываются по ссылке без ключа. Имя на стороне платформы — случайный
 *   UUID, ссылки наружу не отдаются (раздаёт наш сервер после проверки прав),
 *   так что найти файл перебором нельзя. Но это защита ссылкой, а не правами
 *   хранилища.
 *
 * Скачанные файлы кэшируются в STORAGE_DIR/relax-cache: SCORM-пакет — это
 * сотни мелких файлов на каждый запуск, гонять их каждый раз через сеть долго.
 * Кэш живёт до перезапуска контейнера; источник истины — платформа.
 */

const DEFAULT_API = 'https://relaxdev.ru/api/v1/storage'
/** Подпапка проекта в хранилище платформы. */
const REMOTE_FOLDER = 'lms'
const UPLOAD_TIMEOUT_MS = 10 * 60_000
const DOWNLOAD_TIMEOUT_MS = 60_000

function apiKey(): string | undefined {
  return env('STORAGE_API_KEY')
}

export function isRelaxConfigured(): boolean {
  return Boolean(apiKey())
}

function apiBase(): string {
  return (env('STORAGE_API_URL') || DEFAULT_API).replace(/\/+$/, '')
}

/**
 * Где платформа держит файл: `own` — её собственные серверы (без лимита 100 МБ
 * на файл), `cdn` — CDN. Файлы всё равно раздаёт наш сервер, поэтому CDN не
 * нужен; переменная оставлена на случай, если платформа попросит сменить.
 */
function location(): string {
  return env('STORAGE_LOCATION') === 'cdn' ? 'cdn' : 'own'
}

export function relaxDescription(): string {
  return `RelaxDEV Storage (${location()})`
}

// ---------------- таблица соответствия ----------------

let schemaReady: Promise<void> | undefined

async function db(): Promise<Sql> {
  const sql = getSql()
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS storage_objects (
          key TEXT PRIMARY KEY,
          remote_path TEXT NOT NULL,
          url TEXT NOT NULL,
          fallback_url TEXT,
          content_type TEXT,
          size BIGINT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
    })().catch((err) => {
      schemaReady = undefined
      throw err
    })
  }
  await schemaReady
  return sql
}

interface ObjectRow {
  remotePath: string
  url: string
  fallbackUrl?: string
  contentType?: string
  size: number
}

async function findRow(key: string): Promise<ObjectRow | undefined> {
  const sql = await db()
  const rows = await sql`
    SELECT remote_path, url, fallback_url, content_type, size FROM storage_objects WHERE key = ${key} LIMIT 1
  `
  const r = rows[0]
  if (!r) return undefined
  return {
    remotePath: r.remote_path as string,
    url: r.url as string,
    fallbackUrl: (r.fallback_url as string | null) ?? undefined,
    contentType: (r.content_type as string | null) ?? undefined,
    size: Number(r.size) || 0,
  }
}

function notFound(key: string): Error {
  return Object.assign(new Error(`Нет объекта: ${key}`), { name: 'NoSuchKey' })
}

// ---------------- API платформы ----------------

async function apiError(res: Response, action: string): Promise<Error> {
  let detail = ''
  try {
    const body = (await res.json()) as { message?: string; error?: string; code?: string }
    if (body.code === 'STORAGE_QUOTA') {
      return new Error('Хранилище RelaxDEV заполнено (лимит тарифа). Освободите место или смените тариф.')
    }
    detail = body.message || body.error || ''
  } catch {
    // тело не JSON — хватит кода ответа
  }
  if (res.status === 401 || res.status === 403) {
    return new Error(`RelaxDEV Storage отклонил ключ (${res.status}). Сгенерируйте STORAGE_API_KEY заново и сделайте редеплой.`)
  }
  return new Error(`RelaxDEV Storage: ${action} — HTTP ${res.status}${detail ? `: ${detail}` : ''}`)
}

/** Удалить файл на платформе. Отсутствующий файл — не ошибка. */
async function remoteDelete(remotePath: string): Promise<void> {
  const res = await fetch(`${apiBase()}/files?path=${encodeURIComponent(remotePath)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey()}` },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  })
  if (!res.ok && res.status !== 404) throw await apiError(res, 'удаление')
}

/** Расширение из ключа — только безопасные символы, чтобы не ломать имя на платформе. */
function safeExt(key: string): string {
  const ext = path.posix.extname(key).toLowerCase()
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : ''
}

export async function relaxPut(key: string, body: Buffer | Uint8Array | string, contentType: string): Promise<void> {
  const key_ = apiKey()
  if (!key_) throw new Error('Не задан STORAGE_API_KEY — хранилище RelaxDEV не настроено')

  const bytes = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body)
  const form = new FormData()
  // Случайное имя: ссылки платформы открываются без ключа, угадываемое имя
  // («index.html») было бы приглашением к перебору.
  form.append('file', new Blob([bytes], { type: contentType }), `${crypto.randomUUID()}${safeExt(key)}`)
  form.append('path', REMOTE_FOLDER)
  form.append('webp', 'false')
  form.append('storage', location())

  const res = await fetch(`${apiBase()}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key_}` },
    body: form,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  })
  if (!res.ok) throw await apiError(res, 'загрузка')
  const out = (await res.json()) as { success?: boolean; url?: string; fallbackUrl?: string; path?: string }
  if (!out.success || !out.url || !out.path) {
    throw new Error('RelaxDEV Storage: неожиданный ответ на загрузку (нет url/path)')
  }

  const sql = await db()
  const previous = await findRow(key)
  await sql`
    INSERT INTO storage_objects (key, remote_path, url, fallback_url, content_type, size)
    VALUES (${key}, ${out.path}, ${out.url}, ${out.fallbackUrl ?? null}, ${contentType}, ${bytes.length})
    ON CONFLICT (key) DO UPDATE SET
      remote_path = EXCLUDED.remote_path,
      url = EXCLUDED.url,
      fallback_url = EXCLUDED.fallback_url,
      content_type = EXCLUDED.content_type,
      size = EXCLUDED.size,
      updated_at = NOW()
  `
  // Перезапись: старый файл больше ни на что не ссылается — убираем, чтобы не
  // съедал квоту. Сбой здесь не повод проваливать загрузку.
  if (previous && previous.remotePath !== out.path) {
    await remoteDelete(previous.remotePath).catch((err) =>
      console.error(`[storage] не удалось удалить прежнюю версию «${key}»:`, err),
    )
  }
}

// ---------------- чтение с кэшем ----------------

let cacheRootValue: string | undefined
export function setRelaxCacheRoot(dir: string): void {
  cacheRootValue = dir
}

function cacheFileFor(row: ObjectRow): string | undefined {
  if (!cacheRootValue) return undefined
  const name = crypto.createHash('sha256').update(row.remotePath).digest('hex')
  return path.join(cacheRootValue, name)
}

/** Загрузки в кэш, идущие прямо сейчас, — чтобы не качать один файл дважды. */
const inflight = new Set<string>()

/** Скачать файл целиком в кэш (фоном — для видео, которое читают кусками). */
function warmCache(row: ObjectRow, file: string): void {
  if (inflight.has(file)) return
  inflight.add(file)
  void (async () => {
    const res = await fetchRemote(row)
    if (res.status !== 200 || !res.body) return
    await writeCache(Readable.fromWeb(res.body as WebReadableStream), file, row.size)
  })()
    .catch((err) => console.warn('[storage] кэш не прогрет:', err instanceof Error ? err.message : err))
    .finally(() => inflight.delete(file))
}

/** Записать поток в кэш атомарно: сначала во временный файл, потом rename. */
async function writeCache(stream: Readable, file: string, expectedSize: number): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.part`
  await new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(tmp)
    stream.on('error', reject)
    out.on('error', reject)
    out.on('finish', resolve)
    stream.pipe(out)
  }).catch(async (err) => {
    await fsp.rm(tmp, { force: true })
    throw err
  })
  // Оборванная загрузка не должна осесть в кэше как «целый» файл.
  const { size } = await fsp.stat(tmp)
  if (expectedSize > 0 && size !== expectedSize) {
    await fsp.rm(tmp, { force: true })
    throw new Error(`размер ${size} вместо ${expectedSize}`)
  }
  await fsp.rename(tmp, file)
}

/** Запрос к файлу на платформе: основная ссылка, при сбое — запасная. */
async function fetchRemote(row: ObjectRow, range?: string): Promise<Response> {
  const headers: Record<string, string> = range ? { Range: range } : {}
  const urls = [row.url, row.fallbackUrl].filter((u): u is string => Boolean(u))
  let lastError: unknown
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
      // 404 у основной ссылки — файла нет и у запасной: это один и тот же путь.
      if (res.ok || res.status === 404 || res.status === 416) return res
      lastError = new Error(`HTTP ${res.status} от ${new URL(url).host}`)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError ?? new Error('Нет ссылки на файл')
}

export async function relaxGet(
  key: string,
  range: string | undefined,
  readLocal: (file: string, range?: string, contentType?: string) => Promise<StoredObject>,
): Promise<StoredObject> {
  const row = await findRow(key)
  if (!row) throw notFound(key)

  const cached = cacheFileFor(row)
  if (cached) {
    try {
      return await readLocal(cached, range, row.contentType)
    } catch {
      // В кэше нет — идём на платформу.
    }
  }

  const res = await fetchRemote(row, range)
  if (res.status === 404) throw notFound(key)
  if (!res.ok || !res.body) throw new Error(`RelaxDEV Storage: чтение «${key}» — HTTP ${res.status}`)

  const source = Readable.fromWeb(res.body as WebReadableStream)
  let body: Readable = source
  const partial = res.status === 206
  if (cached) {
    if (partial) {
      // Видео читают кусками — целиком в кэш его докачаем фоном.
      warmCache(row, cached)
    } else if (!inflight.has(cached)) {
      // Полный ответ отдаём клиенту и параллельно пишем в кэш. Два pipe из
      // одного источника: поток идёт со скоростью медленного из получателей,
      // а данные не начнут течь, пока оба не подключены.
      inflight.add(cached)
      const toClient = new PassThrough()
      const toCache = new PassThrough()
      source.on('error', (err) => {
        toClient.destroy(err)
        toCache.destroy(err)
      })
      source.pipe(toClient)
      source.pipe(toCache)
      body = toClient
      void writeCache(toCache, cached, row.size)
        .catch((err) => console.warn('[storage] кэш не записан:', err instanceof Error ? err.message : err))
        .finally(() => inflight.delete(cached))
    }
  }

  const length = Number(res.headers.get('content-length'))
  return {
    body,
    contentType: row.contentType || res.headers.get('content-type') || undefined,
    contentLength: Number.isFinite(length) && length > 0 ? length : undefined,
    contentRange: res.headers.get('content-range') ?? undefined,
    status: partial ? 206 : 200,
  }
}

export async function relaxHead(key: string): Promise<{ size: number; contentType?: string } | null> {
  const row = await findRow(key)
  return row ? { size: row.size, contentType: row.contentType } : null
}

export async function relaxList(prefix: string): Promise<Array<{ key: string; size: number }>> {
  const sql = await db()
  // Префикс — литерал, а не шаблон LIKE: экранируем %, _ и сам \.
  const pattern = `${prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  const rows = await sql`SELECT key, size FROM storage_objects WHERE key LIKE ${pattern} ORDER BY key`
  return rows.map((r) => ({ key: r.key as string, size: Number(r.size) || 0 }))
}

export async function relaxDelete(keys: string[]): Promise<void> {
  if (!keys.length) return
  const sql = await db()
  const rows = await sql`SELECT key, remote_path FROM storage_objects WHERE key = ANY(${keys})`
  // Удаляем на платформе небольшими пачками параллельно: у пакета сотни файлов.
  const queue = rows.map((r) => ({ key: r.key as string, remotePath: r.remote_path as string }))
  const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        await remoteDelete(item.remotePath)
      } catch (err) {
        // Запись всё равно убираем: иначе файл, который не удалось стереть,
        // продолжал бы раздаваться как живой. Осиротевший файл на платформе
        // занимает квоту, но ничего не ломает — пишем в лог.
        console.error(`[storage] не удалось удалить «${item.key}» на платформе:`, err)
      }
    }
  })
  await Promise.all(workers)
  await sql`DELETE FROM storage_objects WHERE key = ANY(${keys})`
}
