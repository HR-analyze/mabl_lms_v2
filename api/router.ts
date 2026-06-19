import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { getSql } from './_db.js'
import { ensureSchema, initDatabase } from './_seed.js'
import { syncTelegramNews } from './_telegram.js'
import type { AdminUser, Course, NewsItem, Order, User } from '../src/types'

// Mock-модули служат источником статического контента (только import type внутри —
// при сборке зависимостей от @/ не остаётся). Расширения .js обязательны для ESM.
import { courses as seedCourses } from '../src/data/courses.js'
import { events, getNextWebinar } from '../src/data/events.js'
import { news } from '../src/data/news.js'
import { materials } from '../src/data/materials.js'
import { surveys } from '../src/data/surveys.js'
import { forumSections, forumTopics } from '../src/data/forum.js'
import { notifications } from '../src/data/notifications.js'
import { orders } from '../src/data/orders.js'
import { adminUsers } from '../src/data/users.js'

/**
 * Единый роутер всех /api/* эндпоинтов.
 *
 * Все /api/* запросы попадают сюда через rewrite в vercel.json
 * (`/api/(.*) → /api/router?path=$1`) — детерминированно для всех HTTP-методов.
 * Файл api/setup.ts имеет приоритет (прямое попадание по файловой системе).
 *
 * Каталог курсов и аутентификация — из БД Neon; остальные ресурсы (события,
 * новости, материалы, форум, опросники, заказы, участники) пока отдаются из
 * mock-модулей, единых с фронтендом.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — нужен для POST/PUT/DELETE из браузера.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  // Путь приходит в query-параметре path (из rewrite). Fallback — из req.url.
  const rawPath = req.query.path
  let segments =
    (typeof rawPath === 'string'
      ? rawPath
      : Array.isArray(rawPath)
        ? rawPath.join('/')
        : ''
    )
      .split('/')
      .filter(Boolean)

  if (segments.length === 0) {
    const pathname = (req.url || '').split('?')[0]
    segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean)
    if (segments[0] === 'api') segments = segments.slice(1)
    if (segments[0] === 'router') segments = segments.slice(1)
  }

  const method = (req.method || 'GET').toUpperCase()
  const path = segments.join('/')
  console.log(`[api] ${method} /${path} | url=${req.url}`)

  try {
    // ---------- AUTH ----------
    if (path === 'auth/login' && method === 'POST') {
      return await login(req, res)
    }
    if (path === 'auth/migrate' && method === 'POST') {
      const sql = getSql()
      await sql`UPDATE users SET name = 'Администратор' WHERE id = 'u-adm' AND name = 'Елена Северова'`
      return res.json({ ok: true })
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
    if (path === 'events/next' && method === 'GET') return res.json(getNextWebinar() ?? null)
    if (segments[0] === 'events' && segments.length === 2 && method === 'GET') {
      return found(res, events.find((e) => e.id === segments[1]), 'Событие не найдено')
    }

    // ---------- NEWS (БД + импорт из Telegram) ----------
    // Синхронизация из Telegram-канала. GET — вызывается Vercel Cron,
    // POST — кнопкой «Обновить из Telegram» в админ-панели.
    if (path === 'news/sync' && (method === 'GET' || method === 'POST')) {
      const sql = getSql()
      const result = await syncTelegramNews(sql)
      return res.json({ ok: true, ...result })
    }
    if (path === 'news' && method === 'GET') return res.json(await listNews())
    if (path === 'news' && method === 'POST') return await createNews(req, res)
    if (path === 'news/reset' && method === 'POST') {
      const sql = getSql()
      await sql`DELETE FROM news`
      return res.json([])
    }
    // Комментарии и реакции к новости.
    if (segments[0] === 'news' && segments.length >= 3) {
      const newsId = segments[1]
      const sub = segments[2]
      if (sub === 'comments') {
        if (segments.length === 3 && method === 'GET') return res.json(await listComments(newsId))
        if (segments.length === 3 && method === 'POST') return await createComment(newsId, req, res)
        if (segments.length === 4 && method === 'DELETE')
          return await deleteComment(newsId, segments[3], req, res)
      }
      if (sub === 'reactions') {
        const userId = typeof req.query.userId === 'string' ? req.query.userId : ''
        if (method === 'GET') return res.json(await getReactions(newsId, userId))
        if (method === 'POST') return await toggleReaction(newsId, req, res)
      }
    }
    if (segments[0] === 'news' && segments.length === 2) {
      const id = segments[1]
      if (method === 'GET') return found(res, await getNewsItem(id), 'Новость не найдена')
      if (method === 'PUT') return await updateNews(id, req, res)
      if (method === 'DELETE') return await deleteNews(id, res)
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

    // ---------- PROFILE ----------
    if (path === 'admin/profile' && method === 'PATCH') {
      return await updateProfile(req, res)
    }

    // ---------- DATABASE (управление БД из админки) ----------
    if (path === 'admin/db' && method === 'GET') {
      return await dbStatus(res)
    }
    if (path === 'admin/db/init' && method === 'POST') {
      const sql = getSql()
      const counts = await initDatabase(sql)
      return res.json({ ok: true, counts })
    }
    if (path === 'admin/db/reset-courses' && method === 'POST') {
      return await resetCourses(res)
    }
    if (path === 'admin/db/users' && method === 'POST') {
      return await createDbUser(req, res)
    }
    if (segments[0] === 'admin' && segments[1] === 'db' && segments[2] === 'users' && segments.length === 4) {
      const id = segments[3]
      if (method === 'PUT') return await updateDbUser(id, req, res)
      if (method === 'DELETE') return await deleteDbUser(id, res)
    }

    if (path === 'admin/scorm' && method === 'GET') return res.json([])

    // ---------- ADMIN · УЧАСТНИКИ (БД) ----------
    if (path === 'admin/users' && method === 'GET') return res.json(await listParticipants())
    if (path === 'admin/users' && method === 'POST') return await createParticipant(req, res)
    if (path === 'admin/users/reset' && method === 'POST') return await resetParticipants(res)
    if (
      segments[0] === 'admin' &&
      segments[1] === 'users' &&
      segments[3] === 'status' &&
      method === 'PATCH'
    ) {
      const { status } = parseBody(req)
      return await setParticipantStatus(segments[2], String(status ?? ''), res)
    }
    if (segments[0] === 'admin' && segments[1] === 'users' && segments.length === 3) {
      const id = segments[2]
      if (method === 'GET') return found(res, await getParticipant(id), 'Участник не найден')
      if (method === 'PUT') return await updateParticipant(id, req, res)
      if (method === 'DELETE') return await deleteParticipant(id, res)
    }

    // ---------- ADMIN · ЗАКАЗЫ (БД) ----------
    if (path === 'admin/orders' && method === 'GET') return res.json(await listOrders())
    if (path === 'admin/orders' && method === 'POST') return await createOrder(req, res)
    if (path === 'admin/orders/reset' && method === 'POST') return await resetOrders(res)
    if (segments[0] === 'admin' && segments[1] === 'orders' && segments.length === 3) {
      const id = segments[2]
      if (method === 'GET') return found(res, await getOrder(id), 'Заказ не найден')
      if (method === 'PUT') return await updateOrder(id, req, res)
      if (method === 'DELETE') return await deleteOrder(id, res)
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

// ---------------- news helpers ----------------

async function listNews(): Promise<NewsItem[]> {
  try {
    const sql = getSql()
    await ensureSchema(sql)
    const rows = await sql`SELECT data FROM news ORDER BY published_at DESC NULLS LAST`
    if (rows.length === 0) return news
    return rows.map((r) => r.data as NewsItem)
  } catch {
    // Нет БД (например, локальный mock-режим) — отдаём статический список.
    return news
  }
}

async function getNewsItem(id: string): Promise<NewsItem | undefined> {
  try {
    const sql = getSql()
    const rows = await sql`SELECT data FROM news WHERE id = ${id} LIMIT 1`
    if (rows[0]) return rows[0].data as NewsItem
  } catch {
    /* fallthrough к статике */
  }
  return news.find((n) => n.id === id)
}

async function createNews(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  const body = parseBody(req) as Partial<NewsItem>
  const desired = (body.id && String(body.id).trim()) || slugify(String(body.title ?? 'news'))
  const taken = await sql`SELECT id FROM news`
  const ids = new Set(taken.map((r) => r.id as string))
  const id = uniqueId(desired, ids)
  const item = { ...body, id } as NewsItem
  await sql`
    INSERT INTO news (id, data, published_at, source)
    VALUES (${id}, ${JSON.stringify(item)}::jsonb, ${item.date ?? null}, 'manual')
  `
  return res.status(201).json(item)
}

async function updateNews(id: string, req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  const rows = await sql`SELECT data FROM news WHERE id = ${id} LIMIT 1`
  if (!rows[0]) return res.status(404).json({ message: 'Новость не найдена' })
  const patch = parseBody(req) as Partial<NewsItem>
  const next = { ...(rows[0].data as NewsItem), ...patch, id } as NewsItem
  await sql`
    UPDATE news SET data = ${JSON.stringify(next)}::jsonb,
      published_at = ${next.date ?? null}, updated_at = NOW()
    WHERE id = ${id}
  `
  return res.json(next)
}

async function deleteNews(id: string, res: VercelResponse) {
  const sql = getSql()
  await sql`DELETE FROM news WHERE id = ${id}`
  return res.status(204).end()
}

// ---------------- news comments & reactions ----------------

function toComment(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    newsId: r.news_id as string,
    userId: (r.user_id as string | null) ?? null,
    author: r.author as string,
    body: r.body as string,
    createdAt: r.created_at as string,
  }
}

async function listComments(newsId: string) {
  const sql = getSql()
  await ensureSchema(sql)
  const rows = await sql`
    SELECT id, news_id, user_id, author, body, created_at
    FROM news_comments WHERE news_id = ${newsId} ORDER BY created_at ASC
  `
  return rows.map(toComment)
}

async function createComment(newsId: string, req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  const b = parseBody(req)
  const author = (String(b.author ?? '').trim() || 'Участник').slice(0, 120)
  const body = String(b.body ?? '').trim()
  const userId = b.userId ? String(b.userId) : null
  if (!body) return res.status(400).json({ message: 'Комментарий не может быть пустым.' })
  if (body.length > 2000) return res.status(400).json({ message: 'Слишком длинный комментарий (макс. 2000 символов).' })
  const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const rows = await sql`
    INSERT INTO news_comments (id, news_id, user_id, author, body)
    VALUES (${id}, ${newsId}, ${userId}, ${author}, ${body})
    RETURNING id, news_id, user_id, author, body, created_at
  `
  return res.status(201).json(toComment(rows[0]))
}

async function deleteComment(
  newsId: string,
  commentId: string,
  req: VercelRequest,
  res: VercelResponse,
) {
  const sql = getSql()
  const rows = await sql`SELECT user_id FROM news_comments WHERE id = ${commentId} AND news_id = ${newsId} LIMIT 1`
  if (!rows[0]) return res.status(404).json({ message: 'Комментарий не найден' })
  const userId = typeof req.query.userId === 'string' ? req.query.userId : ''
  const isOwner = Boolean(rows[0].user_id) && rows[0].user_id === userId
  let isAdmin = false
  if (userId) {
    const u = await sql`SELECT kind FROM users WHERE id = ${userId} LIMIT 1`
    isAdmin = u[0]?.kind === 'admin'
  }
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Нет прав на удаление комментария.' })
  await sql`DELETE FROM news_comments WHERE id = ${commentId}`
  return res.status(204).end()
}

async function getReactions(newsId: string, userId: string) {
  const sql = getSql()
  await ensureSchema(sql)
  const counts = await sql`
    SELECT emoji, COUNT(*)::int AS n FROM news_reactions WHERE news_id = ${newsId} GROUP BY emoji
  `
  const mine = userId
    ? await sql`SELECT emoji FROM news_reactions WHERE news_id = ${newsId} AND user_id = ${userId}`
    : []
  const countsObj: Record<string, number> = {}
  for (const r of counts) countsObj[r.emoji as string] = Number(r.n)
  return { counts: countsObj, mine: mine.map((r) => r.emoji as string) }
}

async function toggleReaction(newsId: string, req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  const b = parseBody(req)
  const userId = b.userId ? String(b.userId) : ''
  const emoji = String(b.emoji ?? '').trim()
  if (!userId) return res.status(401).json({ message: 'Войдите, чтобы поставить реакцию.' })
  if (!emoji || emoji.length > 16) return res.status(400).json({ message: 'Некорректная реакция.' })
  const existing = await sql`
    SELECT 1 FROM news_reactions WHERE news_id = ${newsId} AND user_id = ${userId} AND emoji = ${emoji} LIMIT 1
  `
  if (existing[0]) {
    await sql`DELETE FROM news_reactions WHERE news_id = ${newsId} AND user_id = ${userId} AND emoji = ${emoji}`
  } else {
    await sql`
      INSERT INTO news_reactions (news_id, user_id, emoji) VALUES (${newsId}, ${userId}, ${emoji})
      ON CONFLICT DO NOTHING
    `
  }
  return res.json(await getReactions(newsId, userId))
}

// ---------------- admin participants (БД) ----------------

async function ensureParticipantsSeeded(sql: ReturnType<typeof getSql>) {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM participants`
  if (Number(count) > 0) return
  for (let i = 0; i < adminUsers.length; i += 1) {
    const p = adminUsers[i]
    await sql`
      INSERT INTO participants (id, data, sort_order)
      VALUES (${p.id}, ${JSON.stringify(p)}::jsonb, ${i})
      ON CONFLICT (id) DO NOTHING
    `
  }
}

async function listParticipants(): Promise<AdminUser[]> {
  const sql = getSql()
  await ensureSchema(sql)
  await ensureParticipantsSeeded(sql)
  const rows = await sql`SELECT data FROM participants ORDER BY sort_order ASC`
  return rows.map((r) => r.data as AdminUser)
}

async function getParticipant(id: string): Promise<AdminUser | undefined> {
  const sql = getSql()
  const rows = await sql`SELECT data FROM participants WHERE id = ${id} LIMIT 1`
  return rows[0] ? (rows[0].data as AdminUser) : adminUsers.find((u) => u.id === id)
}

async function createParticipant(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  const body = parseBody(req) as Partial<AdminUser>
  const taken = await sql`SELECT id FROM participants`
  const ids = new Set(taken.map((r) => r.id as string))
  const id = uniqueId((body.id && String(body.id).trim()) || `u-${Date.now().toString(36)}`, ids)
  const participant = { ...body, id } as AdminUser
  const [{ max }] = await sql`SELECT COALESCE(MAX(sort_order), 0) + 1 AS max FROM participants`
  await sql`
    INSERT INTO participants (id, data, sort_order)
    VALUES (${id}, ${JSON.stringify(participant)}::jsonb, ${Number(max)})
  `
  return res.status(201).json(participant)
}

async function updateParticipant(id: string, req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  const rows = await sql`SELECT data FROM participants WHERE id = ${id} LIMIT 1`
  if (!rows[0]) return res.status(404).json({ message: 'Участник не найден' })
  const patch = parseBody(req) as Partial<AdminUser>
  const next = { ...(rows[0].data as AdminUser), ...patch, id } as AdminUser
  await sql`UPDATE participants SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id}`
  return res.json(next)
}

async function setParticipantStatus(id: string, status: string, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  await ensureParticipantsSeeded(sql)
  const rows = await sql`SELECT data FROM participants WHERE id = ${id} LIMIT 1`
  if (!rows[0]) return res.status(404).json({ message: 'Участник не найден' })
  const next = { ...(rows[0].data as AdminUser), status } as AdminUser
  await sql`UPDATE participants SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id}`
  return res.json(next)
}

async function deleteParticipant(id: string, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  await ensureParticipantsSeeded(sql)
  await sql`DELETE FROM participants WHERE id = ${id}`
  return res.status(204).end()
}

async function resetParticipants(res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  await sql`DELETE FROM participants`
  for (let i = 0; i < adminUsers.length; i += 1) {
    await sql`
      INSERT INTO participants (id, data, sort_order)
      VALUES (${adminUsers[i].id}, ${JSON.stringify(adminUsers[i])}::jsonb, ${i})
    `
  }
  return res.json(adminUsers)
}

// ---------------- admin orders (БД) ----------------

async function ensureOrdersSeeded(sql: ReturnType<typeof getSql>) {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM orders`
  if (Number(count) > 0) return
  for (let i = 0; i < orders.length; i += 1) {
    const o = orders[i]
    await sql`
      INSERT INTO orders (id, data, sort_order)
      VALUES (${o.id}, ${JSON.stringify(o)}::jsonb, ${i})
      ON CONFLICT (id) DO NOTHING
    `
  }
}

async function listOrders(): Promise<Order[]> {
  const sql = getSql()
  await ensureSchema(sql)
  await ensureOrdersSeeded(sql)
  const rows = await sql`SELECT data FROM orders ORDER BY sort_order ASC`
  return rows.map((r) => r.data as Order)
}

async function getOrder(id: string): Promise<Order | undefined> {
  const sql = getSql()
  const rows = await sql`SELECT data FROM orders WHERE id = ${id} LIMIT 1`
  return rows[0] ? (rows[0].data as Order) : orders.find((o) => o.id === id)
}

async function createOrder(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  const body = parseBody(req) as Partial<Order>
  const taken = await sql`SELECT id FROM orders`
  const ids = new Set(taken.map((r) => r.id as string))
  let id = (body.id && String(body.id).trim()) || ''
  if (!id) {
    let maxNum = 1042
    for (const existing of ids) {
      const n = Number(existing.replace(/\D/g, ''))
      if (Number.isFinite(n) && n > maxNum) maxNum = n
    }
    id = `ORD-${maxNum + 1}`
  }
  id = uniqueId(id, ids)
  const order = { ...body, id } as Order
  const [{ min }] = await sql`SELECT COALESCE(MIN(sort_order), 0) - 1 AS min FROM orders`
  await sql`
    INSERT INTO orders (id, data, sort_order)
    VALUES (${id}, ${JSON.stringify(order)}::jsonb, ${Number(min)})
  `
  return res.status(201).json(order)
}

async function updateOrder(id: string, req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  const rows = await sql`SELECT data FROM orders WHERE id = ${id} LIMIT 1`
  if (!rows[0]) return res.status(404).json({ message: 'Заказ не найден' })
  const patch = parseBody(req) as Partial<Order>
  const next = { ...(rows[0].data as Order), ...patch, id } as Order
  await sql`UPDATE orders SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id}`
  return res.json(next)
}

async function deleteOrder(id: string, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  await ensureOrdersSeeded(sql)
  await sql`DELETE FROM orders WHERE id = ${id}`
  return res.status(204).end()
}

async function resetOrders(res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  await sql`DELETE FROM orders`
  for (let i = 0; i < orders.length; i += 1) {
    await sql`
      INSERT INTO orders (id, data, sort_order)
      VALUES (${orders[i].id}, ${JSON.stringify(orders[i])}::jsonb, ${i})
    `
  }
  return res.json(orders)
}

async function updateProfile(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  const { id, name } = parseBody(req)
  if (!id || !name) return res.status(400).json({ message: 'id и name обязательны' })
  const rows = await sql`UPDATE users SET name = ${String(name)} WHERE id = ${String(id)} RETURNING id, name, email, role, kind`
  if (!rows[0]) return res.status(404).json({ message: 'Пользователь не найден' })
  const u = rows[0]
  return res.json({ id: u.id, name: u.name, email: u.email, role: u.role, kind: u.kind })
}

async function dbStatus(res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  const [{ count: coursesCount }] = await sql`SELECT COUNT(*)::int AS count FROM courses`
  const [{ count: usersCount }] = await sql`SELECT COUNT(*)::int AS count FROM users`
  const users = await sql`
    SELECT id, name, email, role, kind, created_at
    FROM users ORDER BY created_at ASC
  `
  return res.json({
    tables: [
      { name: 'courses', label: 'Программы', rows: Number(coursesCount) },
      { name: 'users', label: 'Аккаунты', rows: Number(usersCount) },
    ],
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      kind: u.kind,
      createdAt: u.created_at,
    })),
  })
}

async function createDbUser(req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  await ensureSchema(sql)
  const body = parseBody(req)
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const role = String(body.role ?? '').trim()
  const kind = body.kind === 'admin' ? 'admin' : 'student'
  const password = String(body.password ?? '')
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Укажите имя, e-mail и пароль.' })
  }
  const exists = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`
  if (exists[0]) return res.status(409).json({ message: 'Пользователь с таким e-mail уже существует.' })
  const id = `u-${Date.now().toString(36)}`
  const hash = await bcrypt.hash(password, 10)
  const finalRole = role || (kind === 'admin' ? 'Администратор платформы' : 'Слушатель академии')
  await sql`
    INSERT INTO users (id, name, email, role, kind, password_hash)
    VALUES (${id}, ${name}, ${email}, ${finalRole}, ${kind}, ${hash})
  `
  return res.status(201).json({ id, name, email, role: finalRole, kind })
}

async function updateDbUser(id: string, req: VercelRequest, res: VercelResponse) {
  const sql = getSql()
  const rows = await sql`SELECT id, name, email, role, kind FROM users WHERE id = ${id} LIMIT 1`
  if (!rows[0]) return res.status(404).json({ message: 'Пользователь не найден' })
  const cur = rows[0]
  const body = parseBody(req)
  const name = body.name !== undefined ? String(body.name).trim() : (cur.name as string)
  const role = body.role !== undefined ? String(body.role).trim() : (cur.role as string)
  const kind = body.kind === 'admin' ? 'admin' : body.kind === 'student' ? 'student' : (cur.kind as string)
  const password = body.password !== undefined ? String(body.password) : ''

  if (password) {
    const hash = await bcrypt.hash(password, 10)
    await sql`UPDATE users SET name = ${name}, role = ${role}, kind = ${kind}, password_hash = ${hash} WHERE id = ${id}`
  } else {
    await sql`UPDATE users SET name = ${name}, role = ${role}, kind = ${kind} WHERE id = ${id}`
  }
  return res.json({ id, name, email: cur.email, role, kind })
}

async function deleteDbUser(id: string, res: VercelResponse) {
  const sql = getSql()
  await sql`DELETE FROM users WHERE id = ${id}`
  return res.status(204).end()
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
