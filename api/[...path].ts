import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { getSql } from './_db'
import type { Course, User } from '../src/types'

// Mock-модули служат источником статического контента (только import type внутри —
// при сборке зависимостей от @/ не остаётся).
import { courses as seedCourses } from '../src/data/courses'
import { events, getNextWebinar } from '../src/data/events'
import { news } from '../src/data/news'
import { materials } from '../src/data/materials'
import { surveys } from '../src/data/surveys'
import { forumSections, forumTopics } from '../src/data/forum'
import { notifications } from '../src/data/notifications'
import { orders } from '../src/data/orders'
import { adminUsers } from '../src/data/users'

/**
 * Единый роутер всех /api/* эндпоинтов.
 *
 * Vercel Hobby ограничивает число serverless-функций, поэтому весь API собран
 * в одну catch-all функцию. Явные файлы (например, api/setup.ts) имеют приоритет
 * над этим маршрутом.
 *
 * Каталог курсов и аутентификация — из БД Neon; остальные ресурсы (события,
 * новости, материалы, форум, опросники, заказы, участники) пока отдаются из
 * mock-модулей, единых с фронтендом.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.path
  const segments = (Array.isArray(raw) ? raw : [raw]).filter(Boolean) as string[]
  const method = (req.method || 'GET').toUpperCase()
  const path = segments.join('/')

  try {
    // ---------- AUTH ----------
    if (path === 'auth/login' && method === 'POST') {
      return await login(req, res)
    }
    if (path === 'auth/recover' && method === 'POST') {
      const { email } = parseBody(req)
      if (!email || !String(email).includes('@')) {
        return res.status(400).json({ message: 'Укажите корректный e-mail.' })
      }
      return res.json({ message: `Инструкция по восстановлению доступа отправлена на ${email}.` })
    }

    // ---------- COURSES (БД) ----------
    if (path === 'courses' && method === 'GET') {
      return res.json(await listCourses())
    }
    if (path === 'courses' && method === 'POST') {
      return await createCourse(req, res)
    }
    if (path === 'courses/reset' && method === 'POST') {
      return await resetCourses(res)
    }
    if (segments[0] === 'courses' && segments.length === 2) {
      const id = segments[1]
      if (method === 'GET') {
        const course = await getCourse(id)
        return course ? res.json(course) : res.status(404).json({ message: 'Программа не найдена' })
      }
      if (method === 'PUT') return await updateCourse(id, req, res)
      if (method === 'DELETE') return await deleteCourse(id, res)
    }

    // ---------- EVENTS (mock) ----------
    if (path === 'events' && method === 'GET') return res.json(events)
    if (path === 'events/next' && method === 'GET') return res.json(getNextWebinar())
    if (segments[0] === 'events' && segments.length === 2 && method === 'GET') {
      return found(res, events.find((e) => e.id === segments[1]), 'Событие не найдено')
    }

    // ---------- NEWS (mock) ----------
    if (path === 'news' && method === 'GET') return res.json(news)
    if (segments[0] === 'news' && segments.length === 2 && method === 'GET') {
      return found(res, news.find((n) => n.id === segments[1]), 'Новость не найдена')
    }

    // ---------- MATERIALS (mock) ----------
    if (path === 'materials' && method === 'GET') return res.json(materials)
    if (segments[0] === 'materials' && segments.length === 2 && method === 'GET') {
      return found(res, materials.find((m) => m.id === segments[1]), 'Материал не найден')
    }

    // ---------- SURVEYS (mock) ----------
    if (path === 'surveys' && method === 'GET') return res.json(surveys)
    if (segments[0] === 'surveys' && segments.length === 2 && method === 'GET') {
      return found(res, surveys.find((s) => s.id === segments[1]), 'Опросник не найден')
    }

    // ---------- FORUM (mock) ----------
    if (path === 'forum/sections' && method === 'GET') return res.json(forumSections)
    if (path === 'forum/topics' && method === 'GET') return res.json(forumTopics)
    if (path.startsWith('forum/sections/') && segments.length === 3 && method === 'GET') {
      return found(res, forumSections.find((s) => s.id === segments[2]), 'Раздел не найден')
    }
    if (path.startsWith('forum/topics/') && segments.length === 3 && method === 'GET') {
      return found(res, forumTopics.find((t) => t.id === segments[2]), 'Тема не найдена')
    }

    // ---------- NOTIFICATIONS (mock) ----------
    if (path === 'notifications' && method === 'GET') return res.json(notifications)

    // ---------- ADMIN (mock) ----------
    if (path === 'admin/orders' && method === 'GET') return res.json(orders)
    if (path === 'admin/users' && method === 'GET') return res.json(adminUsers)
    if (path === 'admin/scorm' && method === 'GET') return res.json([])
    if (segments[0] === 'admin' && segments[1] === 'users' && segments.length === 3 && method === 'GET') {
      return found(res, adminUsers.find((u) => u.id === segments[2]), 'Участник не найден')
    }
    if (
      segments[0] === 'admin' &&
      segments[1] === 'users' &&
      segments[3] === 'status' &&
      method === 'PATCH'
    ) {
      const user = adminUsers.find((u) => u.id === segments[2])
      if (!user) return res.status(404).json({ message: 'Участник не найден' })
      const { status } = parseBody(req)
      return res.json({ ...user, status })
    }

    return res.status(404).json({ message: `Маршрут не найден: ${method} /api/${path}` })
  } catch (err: unknown) {
    console.error('API error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ message })
  }
}

// ---------------- helpers ----------------

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body as Record<string, unknown>
}

function found(res: VercelResponse, value: unknown, notFoundMsg: string) {
  return value ? res.json(value) : res.status(404).json({ message: notFoundMsg })
}

async function login(req: VercelRequest, res: VercelResponse) {
  const { email, password } = parseBody(req)
  const normalized = String(email ?? '').trim().toLowerCase()
  if (!normalized || !password) {
    return res.status(400).json({ message: 'Укажите e-mail и пароль.' })
  }

  const sql = getSql()
  const rows = await sql`
    SELECT id, name, email, role, kind, password_hash
    FROM users WHERE email = ${normalized} LIMIT 1
  `
  const row = rows[0]
  if (!row) {
    return res.status(401).json({ message: 'Неверный e-mail или пароль. Проверьте данные и попробуйте снова.' })
  }

  const ok = await bcrypt.compare(String(password), row.password_hash as string)
  if (!ok) {
    return res.status(401).json({ message: 'Неверный e-mail или пароль. Проверьте данные и попробуйте снова.' })
  }

  const user: User = {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as string,
    kind: (row.kind as User['kind']) ?? 'student',
  }
  return res.json(user)
}

async function listCourses(): Promise<Course[]> {
  const sql = getSql()
  const rows = await sql`SELECT data FROM courses ORDER BY sort_order ASC`
  if (rows.length === 0) return seedCourses
  return rows.map((r) => r.data as Course)
}

async function getCourse(id: string): Promise<Course | undefined> {
  const sql = getSql()
  const rows = await sql`SELECT data FROM courses WHERE id = ${id} LIMIT 1`
  return rows[0] ? (rows[0].data as Course) : seedCourses.find((c) => c.id === id)
}

async function createCourse(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  const body = parseBody(req) as Partial<Course>
  const id = (body.id && String(body.id).trim()) || slugify(String(body.title ?? 'course'))
  const taken = await sql`SELECT id FROM courses`
  const ids = new Set(taken.map((r) => r.id as string))
  const finalId = uniqueId(id, ids)
  const course = { ...body, id: finalId } as Course
  const [{ max }] = await sql`SELECT COALESCE(MAX(sort_order), 0) + 1 AS max FROM courses`
  await sql`
    INSERT INTO courses (id, data, sort_order)
    VALUES (${finalId}, ${JSON.stringify(course)}::jsonb, ${Number(max)})
  `
  return res.status(201).json(course)
}

async function updateCourse(id: string, req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  const rows = await sql`SELECT data FROM courses WHERE id = ${id} LIMIT 1`
  if (!rows[0]) return res.status(404).json({ message: 'Программа не найдена' })
  const patch = parseBody(req) as Partial<Course>
  const next = { ...(rows[0].data as Course), ...patch, id } as Course
  await sql`UPDATE courses SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id}`
  return res.json(next)
}

async function deleteCourse(id: string, res: VercelResponse) {
  const sql = getSql()
  await sql`DELETE FROM courses WHERE id = ${id}`
  return res.status(204).end()
}

async function resetCourses(res: VercelResponse) {
  const sql = getSql()
  await sql`DELETE FROM courses`
  for (let i = 0; i < seedCourses.length; i += 1) {
    await sql`
      INSERT INTO courses (id, data, sort_order)
      VALUES (${seedCourses[i].id}, ${JSON.stringify(seedCourses[i])}::jsonb, ${i})
    `
  }
  return res.json(seedCourses)
}

function slugify(value: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ' ': '-',
  }
  const base = value
    .toLowerCase()
    .split('')
    .map((ch) => (ch in map ? map[ch] : /[a-z0-9-]/.test(ch) ? ch : ''))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'course'
}

function uniqueId(desired: string, taken: Set<string>): string {
  let id = desired
  if (taken.has(id)) {
    let n = 2
    while (taken.has(`${id}-${n}`)) n += 1
    id = `${id}-${n}`
  }
  return id
}
