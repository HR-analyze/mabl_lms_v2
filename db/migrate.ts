import { applySchema } from '../api/_lib/setup'

/**
 * Применяет схему БД (создаёт таблицы). Источник схемы — api/_lib/schema.ts.
 * Запуск: POSTGRES_URL=... npm run db:migrate
 */
const count = await applySchema()
console.log(`✓ Применено выражений схемы: ${count}`)
process.exit(0)
