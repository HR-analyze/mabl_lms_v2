import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from './_db.js'
import { initDatabase } from './_seed.js'

/**
 * Одноразовая инициализация базы данных Neon.
 *
 *   POST /api/setup?secret=<SETUP_SECRET>
 *
 * Создаёт таблицы и заливает сид-данные. Та же логика доступна из админ-панели
 * (POST /api/admin/db/init) — этот файл нужен только для первого запуска по секрету.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = req.query.secret as string | undefined
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const sql = getSql()
    const counts = await initDatabase(sql)
    return res.status(200).json({ ok: true, message: 'База данных инициализирована', counts })
  } catch (err: unknown) {
    console.error('Setup error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
}
