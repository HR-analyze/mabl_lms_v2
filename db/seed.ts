import { runSetup } from '../api/_lib/setup'

/**
 * Создаёт схему и наполняет БД демо-данными (теми же, что в src/data/*).
 * Запуск: POSTGRES_URL=... npm run db:seed
 */
const counts = await runSetup()
console.log('✓ База создана и наполнена демо-данными:')
console.log(counts)
console.log('Демо-вход: demo@mabl.ru / mabl2026 · admin@mabl.ru / admin2026')
process.exit(0)
