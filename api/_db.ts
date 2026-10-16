import fs from 'node:fs'
import pg from 'pg'
import { env, envNumber } from './_env.js'

/**
 * Подключение к PostgreSQL.
 *
 * База — Managed Service for PostgreSQL, подключение по штатному протоколу
 * через `pg`.
 *
 * Запросы пишутся тег-функцией `` sql`SELECT ...` ``: она подставляет значения
 * параметрами ($1, $2, ...) и возвращает массив строк. Параметры, а не склейка
 * строк, — то, что закрывает SQL-инъекции.
 */

/** Строка результата запроса. */
export type SqlRow = Record<string, any>

/**
 * Тег-функция запроса: `` sql`SELECT * FROM t WHERE id = ${id}` ``.
 *
 * Метод `query` — для запросов, которые нельзя выразить шаблоном (например,
 * ALTER TABLE с именем колонки): текст передаётся строкой, значения — массивом
 * параметров.
 */
export interface Sql {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<SqlRow[]>
  query(text: string, params?: unknown[]): Promise<SqlRow[]>
}

let pool: pg.Pool | undefined

/** Имена переменных со строкой подключения — в порядке приоритета. */
const URL_VARS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRESQL_URL',
  'PG_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
]

/**
 * Откуда взять подключение к БД: строка подключения под одним из
 * распространённых имён или стандартный набор libpq (PGHOST, PGPORT, PGUSER,
 * PGPASSWORD, PGDATABASE) — его выдают многие хостинги вместо единой строки.
 */
export function databaseUrlSource(): { url: string; from: string } | undefined {
  for (const name of URL_VARS) {
    const value = env(name)
    if (value) return { url: value, from: name }
  }
  const host = env('PGHOST')
  const user = env('PGUSER')
  if (host && user) {
    const password = env('PGPASSWORD') ?? ''
    const port = env('PGPORT') ?? '5432'
    const database = env('PGDATABASE') ?? user
    const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    const query = env('PGSSLMODE') ? `?sslmode=${encodeURIComponent(env('PGSSLMODE') as string)}` : ''
    return {
      url: `postgresql://${auth}@${host}:${port}/${encodeURIComponent(database)}${query}`,
      from: 'PGHOST/PGUSER/...',
    }
  }
  return undefined
}

/**
 * Имена (без значений) переменных, похожих на настройки БД, — для диагностики,
 * когда подключение не найдено: видно, под каким именем его выдал хостинг.
 */
export function databaseEnvNames(): string[] {
  return Object.keys(process.env)
    .filter((k) => /DATABASE|POSTGRES|^PG|^DB_|_DB_|MYSQL/i.test(k))
    .filter((k) => env(k) !== undefined)
    .sort()
}

function connectionString(): string {
  const source = databaseUrlSource()
  if (!source) {
    throw new Error(
      `Не найдена строка подключения к базе данных (${URL_VARS.join(' / ')} или PGHOST + PGUSER)`,
    )
  }
  return source.url
}

/**
 * Настройки TLS. Управляемые кластеры требуют шифрования и своего корневого
 * сертификата: он кладётся на машину и указывается в DATABASE_CA_FILE
 * (по умолчанию ~/.postgresql/root.crt).
 *
 * TLS выключается `sslmode=disable` в строке подключения или
 * `DATABASE_SSL=disable` — второе нужно на PaaS, где DATABASE_URL подставляет
 * платформа, а база во внутренней сети TLS не поддерживает.
 */
function sslConfig(url: string): pg.ClientConfig['ssl'] {
  const flag = (env('DATABASE_SSL') ?? '').trim().toLowerCase()
  const disabled = /sslmode=disable/.test(url) || ['disable', 'false', 'off', '0'].includes(flag)
  if (disabled) return undefined

  const caFile =
    env('DATABASE_CA_FILE') ||
    `${env('HOME') ?? '/root'}/.postgresql/root.crt`

  if (fs.existsSync(caFile)) {
    return { ca: fs.readFileSync(caFile, 'utf8'), rejectUnauthorized: true }
  }
  // Сертификата нет: шифруем соединение, но без проверки цепочки. Для прода
  // это нежелательно — положите root.crt и укажите DATABASE_CA_FILE.
  console.warn(`[db] корневой сертификат не найден (${caFile}) — TLS без проверки цепочки`)
  return { rejectUnauthorized: false }
}

/** Пул соединений (один на процесс). */
export function getPool(): pg.Pool {
  if (!pool) {
    const url = connectionString()
    pool = new pg.Pool({
      connectionString: url,
      ssl: sslConfig(url),
      max: envNumber('DATABASE_POOL_MAX', 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
    // Ошибка простаивающего клиента не должна ронять процесс целиком.
    pool.on('error', (err) => console.error('[db] ошибка соединения в пуле:', err))
  }
  return pool
}

/**
 * Тег-функция запросов: значения подставляются параметрами (защита от
 * SQL-инъекций), результат — массив строк.
 */
export function getSql(): Sql {
  const db = getPool()
  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = ''
    strings.forEach((part, i) => {
      text += part
      if (i < values.length) text += `$${i + 1}`
    })
    return db.query(text, values).then((result) => result.rows as SqlRow[])
  }) as Sql

  sql.query = (text: string, params: unknown[] = []) =>
    db.query(text, params).then((result) => result.rows as SqlRow[])

  return sql
}

/** Закрыть пул (используется в скриптах и при остановке сервера). */
export async function closePool(): Promise<void> {
  if (pool) {
    const current = pool
    pool = undefined
    await current.end()
  }
}
