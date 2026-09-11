import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { Readable } from 'node:stream'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

/**
 * Файловое хранилище: файлы SCORM-пакетов и материалов.
 *
 * Наружу всё отдаёт наш сервер (`/scorm-store/*` для пакетов и `/files/*` для
 * материалов), поэтому ссылки остаются same-origin. Для SCORM это обязательно:
 * содержимое пакета ищет window.API, поднимаясь по родительским фреймам, а это
 * работает только в пределах одного источника.
 *
 * Хранить файлы можно двумя способами, и выбирается это одной переменной:
 *
 * 1. ДИСК ВМ (по умолчанию). Никаких внешних сервисов и ключей: файлы лежат в
 *    каталоге STORAGE_DIR. Для одной машины этого достаточно — раздаёт их всё
 *    равно наше приложение.
 * 2. S3 (Yandex Object Storage), если задан S3_BUCKET. Нужен, когда машин
 *    несколько или файлы должны пережить пересоздание ВМ.
 *
 * Переменные окружения:
 *   STORAGE_DIR           — каталог на диске (по умолчанию <рабочий каталог>/storage)
 *   S3_BUCKET             — имя бакета; ЗАДАН — значит работаем через S3
 *   S3_ENDPOINT           — https://storage.yandexcloud.net (по умолчанию)
 *   S3_REGION             — ru-central1 (по умолчанию)
 *   S3_ACCESS_KEY_ID      — статический ключ сервисного аккаунта
 *   S3_SECRET_ACCESS_KEY  — секрет этого ключа
 *
 * Переключение бэкенда файлы НЕ переносит: после перехода пакеты нужно залить
 * заново через админку.
 */

const DEFAULT_ENDPOINT = 'https://storage.yandexcloud.net'
const DEFAULT_REGION = 'ru-central1'

let client: S3Client | undefined

/** Где лежат файлы: на диске этой машины или в S3-совместимом хранилище. */
export type StorageBackend = 'disk' | 's3'

/**
 * Выбранный бэкенд. Признак — заданный S3_BUCKET: имя бакета без хранилища
 * бессмысленно, а его отсутствие однозначно означает «храним на диске».
 */
export function storageBackend(): StorageBackend {
  return process.env.S3_BUCKET ? 's3' : 'disk'
}

/**
 * Корень дискового хранилища.
 *
 * По умолчанию — `storage` в рабочем каталоге сервиса (`/srv/mabl-lms/storage`
 * при штатной установке). Каталог переживает `git reset --hard` при деплое,
 * потому что не отслеживается репозиторием. На отдельном диске или в другом
 * месте — задайте STORAGE_DIR.
 */
function diskRoot(): string {
  return path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), 'storage'))
}

/**
 * Путь файла по ключу хранилища.
 *
 * Ключ приходит из запроса, поэтому путь обязательно проверяется на выход за
 * пределы корня: `..` в ключе иначе открыл бы чтение и запись любого файла на
 * машине. Дополнительный `objects/` отделяет данные от метаданных (см. ниже).
 */
function diskPathFor(key: string, kind: 'objects' | 'meta'): string {
  const root = path.join(diskRoot(), kind)
  const full = path.resolve(root, kind === 'meta' ? `${key}.json` : key)
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error(`Недопустимый ключ хранилища: ${key}`)
  }
  return full
}

/**
 * Тип содержимого хранится рядом с файлом, в параллельном дереве `meta/`.
 *
 * Файловая система типов не помнит, а угадывать по расширению недостаточно:
 * у файлов материалов расширения может не быть вовсе, и тогда браузер вместо
 * просмотра PDF предложил бы его скачать. Отдельное дерево (а не файл-сосед)
 * нужно, чтобы метаданные не попадали в перечисление ключей.
 */
async function writeDiskMeta(key: string, contentType: string): Promise<void> {
  const file = diskPathFor(key, 'meta')
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(file, JSON.stringify({ contentType }), 'utf8')
}

async function readDiskMeta(key: string): Promise<string | undefined> {
  try {
    const raw = await fsp.readFile(diskPathFor(key, 'meta'), 'utf8')
    const parsed = JSON.parse(raw) as { contentType?: unknown }
    return typeof parsed.contentType === 'string' ? parsed.contentType : undefined
  } catch {
    // Метаданных нет (файл записан раньше или удалён) — тип определит вызывающий.
    return undefined
  }
}

function accessKeyId(): string | undefined {
  return process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
}

function secretAccessKey(): string | undefined {
  return process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
}

/** Имя бакета; бросает понятную ошибку, если хранилище не настроено. */
export function bucket(): string {
  const name = process.env.S3_BUCKET
  if (!name) throw new Error('Не задан S3_BUCKET — хранилище файлов не настроено')
  return name
}

/**
 * Настроено ли хранилище (для preflight в админке).
 *
 * Дисковому бэкенду настраивать нечего — каталог создаётся при первой записи.
 * S3 без ключей неработоспособен, поэтому там проверяем их наличие.
 */
export function isStorageConfigured(): boolean {
  if (storageBackend() === 'disk') return true
  return Boolean(process.env.S3_BUCKET && accessKeyId() && secretAccessKey())
}

/** Человекочитаемое описание хранилища — для диагностики в админке. */
export function storageDescription(): string {
  return storageBackend() === 'disk' ? `диск ВМ (${diskRoot()})` : `Object Storage (${process.env.S3_BUCKET})`
}

/** Какие переменные хранилища видит процесс (без значений) — для диагностики. */
export function storageEnvNames(): string[] {
  return Object.keys(process.env).filter((k) => k.startsWith('S3_') || k.startsWith('AWS_'))
}

function s3(): S3Client {
  if (!client) {
    const id = accessKeyId()
    const secret = secretAccessKey()
    if (!id || !secret) {
      throw new Error('Не заданы ключи доступа к хранилищу (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)')
    }
    client = new S3Client({
      region: process.env.S3_REGION || DEFAULT_REGION,
      endpoint: process.env.S3_ENDPOINT || DEFAULT_ENDPOINT,
      // Object Storage Яндекса работает по path-style адресации.
      forcePathStyle: true,
      credentials: { accessKeyId: id, secretAccessKey: secret },
    })
  }
  return client
}

/** Записать объект. */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
): Promise<void> {
  const type = contentType || 'application/octet-stream'
  if (storageBackend() === 'disk') {
    const file = diskPathFor(key, 'objects')
    await fsp.mkdir(path.dirname(file), { recursive: true })
    await fsp.writeFile(file, body)
    await writeDiskMeta(key, type)
    return
  }
  await s3().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: type }),
  )
}

export interface StoredObject {
  body: Readable
  contentType?: string
  contentLength?: number
  /** Заголовок Content-Range — есть только при частичном ответе. */
  contentRange?: string
  /** 206 при частичном ответе, иначе 200. */
  status: 200 | 206
}

/**
 * Разобрать заголовок Range вида `bytes=НАЧАЛО-КОНЕЦ`.
 *
 * Поддерживаются все три формы из HTTP: с обеими границами, без конца
 * (`bytes=500-`) и суффиксная (`bytes=-500` — последние N байт). Неразборчивый
 * или выходящий за размер файла диапазон трактуется как его отсутствие: отдать
 * файл целиком безопаснее, чем оборвать проигрывание видео ошибкой.
 */
function parseRange(range: string | undefined, size: number): { start: number; end: number } | null {
  if (!range) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
  if (!match) return null
  const [, rawStart, rawEnd] = match
  if (!rawStart && !rawEnd) return null

  let start: number
  let end: number
  if (!rawStart) {
    // Суффиксная форма: запрошены последние N байт.
    const length = Number(rawEnd)
    if (!Number.isFinite(length) || length <= 0) return null
    start = Math.max(0, size - length)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd ? Number(rawEnd) : size - 1
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (start > end || start >= size) return null
  return { start, end: Math.min(end, size - 1) }
}

/**
 * Прочитать файл с диска по готовому абсолютному пути.
 *
 * Используется и дисковым бэкендом хранилища, и раздачей SCORM-пакетов,
 * лежащих в репозитории. Путь сюда приходит уже проверенным: удержать его в
 * границах своего каталога обязан вызывающий.
 */
export async function getLocalObject(
  file: string,
  range?: string,
  contentType?: string,
): Promise<StoredObject> {
  // stat бросает ENOENT для отсутствующего файла — вызывающий код ловит это
  // так же, как NoSuchKey от S3, и отвечает 404.
  const stat = await fsp.stat(file)
  if (!stat.isFile()) {
    throw Object.assign(new Error(`Не файл: ${file}`), { name: 'NoSuchKey' })
  }
  const part = parseRange(range, stat.size)
  if (part) {
    return {
      body: fs.createReadStream(file, { start: part.start, end: part.end }),
      contentType,
      contentLength: part.end - part.start + 1,
      contentRange: `bytes ${part.start}-${part.end}/${stat.size}`,
      status: 206,
    }
  }
  return {
    body: fs.createReadStream(file),
    contentType,
    contentLength: stat.size,
    status: 200,
  }
}

/** Прочитать объект (с поддержкой Range — нужен для видео внутри пакетов). */
export async function getObject(key: string, range?: string): Promise<StoredObject> {
  if (storageBackend() === 'disk') {
    const file = diskPathFor(key, 'objects')
    return await getLocalObject(file, range, await readDiskMeta(key))
  }

  const out = await s3().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key, Range: range }),
  )
  return {
    body: out.Body as Readable,
    contentType: out.ContentType,
    contentLength: out.ContentLength,
    contentRange: out.ContentRange,
    status: out.ContentRange ? 206 : 200,
  }
}

/** Есть ли объект и какого он размера. */
export async function headObject(key: string): Promise<{ size: number; contentType?: string } | null> {
  try {
    if (storageBackend() === 'disk') {
      const stat = await fsp.stat(diskPathFor(key, 'objects'))
      if (!stat.isFile()) return null
      return { size: stat.size, contentType: await readDiskMeta(key) }
    }
    const out = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }))
    return { size: out.ContentLength ?? 0, contentType: out.ContentType }
  } catch {
    return null
  }
}

/** Обойти каталог дискового хранилища, собирая ключи и размеры. */
async function walkDisk(
  dir: string,
  root: string,
  out: Array<{ key: string; size: number }>,
): Promise<void> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    // Каталога нет — значит и объектов с таким префиксом нет.
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkDisk(full, root, out)
      continue
    }
    if (!entry.isFile()) continue
    const stat = await fsp.stat(full)
    // Ключ хранилища — путь относительно корня, всегда через прямой слэш.
    out.push({ key: path.relative(root, full).split(path.sep).join('/'), size: stat.size })
  }
}

/** Перечислить ключи с префиксом (постранично, до конца). */
export async function listKeys(prefix: string): Promise<Array<{ key: string; size: number }>> {
  const result: Array<{ key: string; size: number }> = []
  if (storageBackend() === 'disk') {
    const root = path.join(diskRoot(), 'objects')
    // Префикс может указывать и на каталог, и на часть имени файла, поэтому
    // обходим ближайший существующий каталог и фильтруем по самому префиксу.
    await walkDisk(path.join(root, prefix), root, result)
    if (result.length === 0) {
      await walkDisk(path.dirname(path.join(root, prefix)), root, result)
      return result.filter((item) => item.key.startsWith(prefix))
    }
    return result
  }

  let token: string | undefined
  do {
    const page = await s3().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }),
    )
    for (const item of page.Contents ?? []) {
      if (item.Key) result.push({ key: item.Key, size: item.Size ?? 0 })
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
  return result
}

/** Удалить объекты пачками по 1000 (лимит протокола S3). */
export async function deleteKeys(keys: string[]): Promise<void> {
  if (storageBackend() === 'disk') {
    for (const key of keys) {
      // Отсутствующий файл — не ошибка: удаление должно быть идемпотентным.
      await fsp.rm(diskPathFor(key, 'objects'), { force: true })
      await fsp.rm(diskPathFor(key, 'meta'), { force: true })
    }
    await pruneEmptyDirs(path.join(diskRoot(), 'objects'))
    await pruneEmptyDirs(path.join(diskRoot(), 'meta'))
    return
  }

  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000)
    if (!chunk.length) continue
    await s3().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      }),
    )
  }
}

/**
 * Убрать опустевшие каталоги: после удаления пакета от него остаётся дерево
 * пустых папок, и следующее перечисление ключей ходило бы по мусору.
 * Возвращает true, если каталог удалён.
 */
async function pruneEmptyDirs(dir: string): Promise<boolean> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return false
  }
  let empty = true
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!(await pruneEmptyDirs(path.join(dir, entry.name)))) empty = false
    } else {
      empty = false
    }
  }
  if (!empty) return false
  try {
    await fsp.rmdir(dir)
    return true
  } catch {
    return false
  }
}

/**
 * Публичный адрес файла на нашем домене. Ключ `materials/report.pdf` →
 * `/files/materials/report.pdf`; раздачей занимается наш сервер.
 */
export function publicUrlFor(key: string): string {
  return `/files/${key.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * Обратное преобразование: из адреса файла получить ключ в хранилище.
 * Понимает и наши адреса (`/files/...`), и старые ссылки Vercel Blob
 * (`https://<store>.public.blob.vercel-storage.com/<key>`) — последние ещё
 * встречаются в записях материалов, перенесённых с Vercel.
 */
export function keyFromUrl(url: string): string | undefined {
  if (!url) return undefined
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url
    const clean = decodeURIComponent(path).replace(/^\/+/, '')
    if (clean.startsWith('files/')) return clean.slice('files/'.length)
    return clean || undefined
  } catch {
    return undefined
  }
}
