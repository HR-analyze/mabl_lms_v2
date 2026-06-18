import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { getSql } from './_db'
import { courses as seedCourses } from '../src/data/courses'

/**
 * Одноразовая инициализация базы данных Neon.
 *
 *   POST /api/setup?secret=<SETUP_SECRET>
 *
 * Создаёт таблицы `courses` (каталог как JSONB) и `users` (учётные записи),
 * заливает курсы из mock-данных и демо-аккаунты. После успешного запуска
 * переменную SETUP_SECRET можно удалить.
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

    // --- Схема ---
    await sql`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        sort_order INT DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'student',
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    // --- Каталог курсов (источник — mock-данные приложения) ---
    let courseCount = 0
    for (let i = 0; i < seedCourses.length; i += 1) {
      const course = seedCourses[i]
      await sql`
        INSERT INTO courses (id, data, sort_order)
        VALUES (${course.id}, ${JSON.stringify(course)}::jsonb, ${i})
        ON CONFLICT (id) DO NOTHING
      `
      courseCount += 1
    }

    // --- Демо-аккаунты (совпадают с экраном входа) ---
    const demoUsers = [
      {
        id: 'u-001',
        name: 'Александр Орлов',
        email: 'demo@mabl.ru',
        role: 'Слушатель академии',
        kind: 'student',
        password: 'mabl2026',
      },
      {
        id: 'u-adm',
        name: 'Елена Северова',
        email: 'admin@mabl.ru',
        role: 'Администратор платформы',
        kind: 'admin',
        password: 'admin2026',
      },
    ]

    for (const u of demoUsers) {
      const hash = await bcrypt.hash(u.password, 10)
      await sql`
        INSERT INTO users (id, name, email, role, kind, password_hash)
        VALUES (${u.id}, ${u.name}, ${u.email}, ${u.role}, ${u.kind}, ${hash})
        ON CONFLICT (email) DO NOTHING
      `
    }

    const [{ count: usersCount }] = await sql`SELECT COUNT(*)::int AS count FROM users`
    const [{ count: coursesTotal }] = await sql`SELECT COUNT(*)::int AS count FROM courses`

    return res.status(200).json({
      ok: true,
      message: 'База данных инициализирована',
      counts: {
        courses: Number(coursesTotal),
        coursesSeeded: courseCount,
        users: Number(usersCount),
      },
    })
  } catch (err: unknown) {
    console.error('Setup error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
}
