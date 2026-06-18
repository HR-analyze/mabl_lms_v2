import bcrypt from 'bcryptjs'
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { courses as seedCourses } from '../src/data/courses.js'

/**
 * Совместно используемая логика инициализации БД (схема + сиды).
 * Вызывается из api/setup.ts (по секрету) и из админ-панели (POST /api/admin/db/init).
 */

type Sql = NeonQueryFunction<false, false>

/** Демо-аккаунты по умолчанию (логин + пароль на экране входа). */
export const defaultUsers = [
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
    name: 'Администратор',
    email: 'admin@mabl.ru',
    role: 'Администратор платформы',
    kind: 'admin',
    password: 'admin2026',
  },
]

/** Создаёт таблицы, если их ещё нет. */
export async function ensureSchema(sql: Sql): Promise<void> {
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
}

/** Полная инициализация: схема + сиды курсов и аккаунтов (без перезаписи существующих). */
export async function initDatabase(sql: Sql): Promise<{ courses: number; users: number }> {
  await ensureSchema(sql)

  for (let i = 0; i < seedCourses.length; i += 1) {
    const course = seedCourses[i]
    await sql`
      INSERT INTO courses (id, data, sort_order)
      VALUES (${course.id}, ${JSON.stringify(course)}::jsonb, ${i})
      ON CONFLICT (id) DO NOTHING
    `
  }

  for (const u of defaultUsers) {
    const hash = await bcrypt.hash(u.password, 10)
    await sql`
      INSERT INTO users (id, name, email, role, kind, password_hash)
      VALUES (${u.id}, ${u.name}, ${u.email}, ${u.role}, ${u.kind}, ${hash})
      ON CONFLICT (email) DO NOTHING
    `
  }

  const [{ count: usersCount }] = await sql`SELECT COUNT(*)::int AS count FROM users`
  const [{ count: coursesCount }] = await sql`SELECT COUNT(*)::int AS count FROM courses`
  return { courses: Number(coursesCount), users: Number(usersCount) }
}
