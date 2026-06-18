import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Общий помощник подключения к Neon PostgreSQL для serverless-функций.
 * Берёт строку подключения из стандартных переменных интеграции Vercel ↔ Neon.
 * Файлы с префиксом `_` Vercel не считает HTTP-маршрутами.
 */
export function getSql(): NeonQueryFunction<false, false> {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING

  if (!connectionString) {
    throw new Error('Не найдена строка подключения к базе данных (DATABASE_URL / POSTGRES_URL)')
  }

  return neon(connectionString)
}
