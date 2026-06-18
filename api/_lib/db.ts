import { sql } from '@vercel/postgres'

/**
 * Подключение к Postgres через @vercel/postgres.
 * Строка подключения берётся из переменной окружения POSTGRES_URL
 * (Vercel задаёт её автоматически при подключении Postgres-хранилища).
 */
export { sql }
