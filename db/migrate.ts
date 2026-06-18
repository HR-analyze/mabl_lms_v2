import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { sql } from '@vercel/postgres'

/**
 * Применяет схему БД (db/schema.sql).
 * Запуск: POSTGRES_URL=... npm run db:migrate
 */

const here = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(here, 'schema.sql'), 'utf8')
const statements = schema
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('--'))

for (const statement of statements) {
  await sql.query(statement)
}

console.log(`✓ Применено выражений схемы: ${statements.length}`)
process.exit(0)
