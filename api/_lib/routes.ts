import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from './db'
import { HttpError, getAuth, readBody, requireAdmin } from './http'
import { hashPassword, signToken, verifyPassword } from './auth'
import { courses as seedCourses } from '../../src/data/courses'
import type { Course } from '../../src/types'

type Json = Record<string, unknown>

/** Колонки курса в порядке вставки. */
function courseValues(c: Course) {
  return [
    c.id,
    c.title,
    c.subtitle,
    c.description,
    c.format,
    c.level,
    c.instructor,
    c.durationHours,
    c.lessonsCount,
    c.price,
    c.progress,
    c.surveyId ?? null,
    JSON.stringify(c.tags ?? []),
    JSON.stringify(c.modules ?? []),
  ]
}

async function insertCourse(c: Course, position: number) {
  const v = courseValues(c)
  await sql.query(
    `INSERT INTO courses
       (id,title,subtitle,description,format,level,instructor,
        "durationHours","lessonsCount",price,progress,"surveyId",tags,modules,position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15)
     ON CONFLICT (id) DO UPDATE SET
       title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, description=EXCLUDED.description,
       format=EXCLUDED.format, level=EXCLUDED.level, instructor=EXCLUDED.instructor,
       "durationHours"=EXCLUDED."durationHours", "lessonsCount"=EXCLUDED."lessonsCount",
       price=EXCLUDED.price, progress=EXCLUDED.progress, "surveyId"=EXCLUDED."surveyId",
       tags=EXCLUDED.tags, modules=EXCLUDED.modules`,
    [...v, position],
  )
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

function slugify(value: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ' ': '-',
  }
  const base = value.toLowerCase().split('').map((ch) =>
    ch in map ? map[ch] : /[a-z0-9-]/.test(ch) ? ch : '',
  ).join('').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return base || 'course'
}

/** Главный диспетчер: (метод, сегменты пути) → обработчик. */
export async function route(
  method: string,
  segs: string[],
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const [resource, a, b, c] = segs

  // --- Авторизация ---
  if (resource === 'auth') {
    if (a === 'login' && method === 'POST') return send(res, await login(req))
    if (a === 'register' && method === 'POST') return send(res, await register(req))
    if (a === 'recover' && method === 'POST') return send(res, await recover(req))
    if (a === 'me' && method === 'GET') return send(res, await me(req))
    throw new HttpError(404, 'Неизвестный метод авторизации.')
  }

  // --- Курсы ---
  if (resource === 'courses') {
    if (!a && method === 'GET') return send(res, await listTable('courses', 'position ASC'))
    if (!a && method === 'POST') return send(res, await createCourse(req))
    if (a === 'reset' && method === 'POST') return send(res, await resetCourses(req))
    if (a && method === 'GET') return send(res, await getById('courses', a))
    if (a && method === 'PUT') return send(res, await updateCourse(req, a))
    if (a && method === 'DELETE') return send(res, await remove('courses', a, req))
    throw new HttpError(404, 'Не найдено.')
  }

  // --- События ---
  if (resource === 'events') {
    if (!a && method === 'GET') return send(res, await listTable('events', 'date ASC'))
    if (a === 'next' && method === 'GET') return send(res, await nextWebinar())
    if (a && method === 'GET') return send(res, await getById('events', a))
    throw new HttpError(404, 'Не найдено.')
  }

  // --- Новости / материалы / опросники ---
  if (resource === 'news') {
    if (!a && method === 'GET') return send(res, await listTable('news', 'date DESC'))
    if (a && method === 'GET') return send(res, await getById('news', a))
  }
  if (resource === 'materials') {
    if (!a && method === 'GET') return send(res, await listTable('materials', 'date DESC'))
    if (a && method === 'GET') return send(res, await getById('materials', a))
  }
  if (resource === 'surveys') {
    if (!a && method === 'GET') return send(res, await listTable('surveys'))
    if (a && method === 'GET') return send(res, await getById('surveys', a))
  }

  // --- Форум ---
  if (resource === 'forum') {
    if (a === 'sections' && !b && method === 'GET') return send(res, await listTable('forum_sections'))
    if (a === 'topics' && !b && method === 'GET') return send(res, await listTable('forum_topics', 'date DESC'))
    if (a === 'sections' && b && method === 'GET') return send(res, await getById('forum_sections', b))
    if (a === 'topics' && b && method === 'GET') return send(res, await getById('forum_topics', b))
    throw new HttpError(404, 'Не найдено.')
  }

  // --- Уведомления ---
  if (resource === 'notifications' && !a && method === 'GET') {
    return send(res, await listTable('notifications', 'date DESC'))
  }

  // --- Админ ---
  if (resource === 'admin') {
    if (a === 'users') {
      requireAdmin(req)
      if (!b && method === 'GET') return send(res, await listTable('users', '"registeredAt" DESC'))
      if (b && c === 'status' && method === 'PATCH') return send(res, await setUserStatus(req, b))
      if (b && !c && method === 'GET') return send(res, await getById('users', b))
    }
    if (a === 'orders' && !b && method === 'GET') {
      requireAdmin(req)
      return send(res, await listTable('orders', 'date DESC'))
    }
    if (a === 'scorm') {
      requireAdmin(req)
      if (!b && method === 'GET') return send(res, await listTable('scorm_packages', '"uploadedAt" DESC'))
      if (b && method === 'DELETE') return send(res, await remove('scorm_packages', b, req))
    }
    throw new HttpError(404, 'Не найдено.')
  }

  throw new HttpError(404, 'Ресурс не найден.')
}

// ---------- helpers ----------

function send(res: VercelResponse, data: unknown) {
  res.status(200).json(data ?? null)
}

const SAFE_TABLES = new Set([
  'courses', 'events', 'news', 'materials', 'surveys',
  'forum_sections', 'forum_topics', 'notifications', 'users', 'orders', 'scorm_packages',
])

function assertTable(table: string) {
  if (!SAFE_TABLES.has(table)) throw new HttpError(400, 'Недопустимая таблица.')
}

/** Список записей таблицы (без password_hash для users). */
async function listTable(table: string, orderBy?: string): Promise<unknown[]> {
  assertTable(table)
  const cols = table === 'users' ? selectUserCols() : '*'
  const order = orderBy ? ` ORDER BY ${orderBy}` : ''
  const { rows } = await sql.query(`SELECT ${cols} FROM ${table}${order}`)
  return rows
}

async function getById(table: string, id: string): Promise<unknown> {
  assertTable(table)
  const cols = table === 'users' ? selectUserCols() : '*'
  const { rows } = await sql.query(`SELECT ${cols} FROM ${table} WHERE id = $1`, [id])
  return rows[0] ?? null
}

function selectUserCols(): string {
  // Для админ-списка форма AdminUser: role = уровень доступа (kind).
  return [
    'id', 'name', 'email', 'kind AS role', 'status',
    '"registeredAt"', '"lastActiveAt"', '"enrolledCourseIds"', '"avgProgress"',
  ].join(',')
}

async function remove(table: string, id: string, req: VercelRequest): Promise<{ ok: true }> {
  assertTable(table)
  if (table === 'courses' || table === 'scorm_packages') requireAdmin(req)
  await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id])
  return { ok: true }
}

// ---------- courses ----------

async function createCourse(req: VercelRequest): Promise<Course> {
  requireAdmin(req)
  const body = readBody<Course>(req)
  const { rows } = await sql.query('SELECT id FROM courses')
  const taken = new Set(rows.map((r) => r.id as string))
  const id = uniqueId((body.id || '').trim() || slugify(body.title), taken)
  const created: Course = { ...body, id }
  const { rows: posRows } = await sql.query('SELECT COALESCE(MAX(position),0)+1 AS p FROM courses')
  await insertCourse(created, posRows[0].p as number)
  return (await getById('courses', id)) as Course
}

async function updateCourse(req: VercelRequest, id: string): Promise<Course> {
  requireAdmin(req)
  const patch = readBody<Partial<Course>>(req)
  const existing = (await getById('courses', id)) as Course | null
  if (!existing) throw new HttpError(404, 'Программа не найдена.')
  const merged: Course = { ...existing, ...patch, id }
  const { rows } = await sql.query('SELECT position FROM courses WHERE id=$1', [id])
  await insertCourse(merged, (rows[0]?.position as number) ?? 0)
  return (await getById('courses', id)) as Course
}

async function resetCourses(req: VercelRequest): Promise<Course[]> {
  requireAdmin(req)
  await sql.query('TRUNCATE courses')
  for (let i = 0; i < seedCourses.length; i += 1) {
    await insertCourse(seedCourses[i], i + 1)
  }
  return (await listTable('courses', 'position ASC')) as Course[]
}

async function nextWebinar(): Promise<unknown> {
  const { rows } = await sql.query(
    `SELECT * FROM events WHERE type='Вебинар' AND date >= NOW() ORDER BY date ASC LIMIT 1`,
  )
  if (rows[0]) return rows[0]
  const fallback = await sql.query(`SELECT * FROM events WHERE type='Вебинар' ORDER BY date DESC LIMIT 1`)
  return fallback.rows[0] ?? null
}

// ---------- auth ----------

async function login(req: VercelRequest): Promise<{ user: Json; token: string }> {
  const { email, password } = readBody<{ email?: string; password?: string }>(req)
  if (!email || !password) throw new HttpError(400, 'Укажите e-mail и пароль.')
  const { rows } = await sql.query(
    `SELECT id,name,email,role,kind,status,password_hash FROM users WHERE email=$1`,
    [email.trim().toLowerCase()],
  )
  const row = rows[0]
  if (!row || !verifyPassword(password, row.password_hash as string | null)) {
    throw new HttpError(401, 'Неверный e-mail или пароль. Проверьте данные и попробуйте снова.')
  }
  if (row.status === 'blocked') throw new HttpError(403, 'Аккаунт заблокирован.')
  const user: Json = {
    id: row.id, name: row.name, email: row.email, role: row.role, kind: row.kind,
  }
  const token = signToken({ sub: row.id as string, kind: row.kind as 'admin' | 'student', email: row.email as string })
  return { user, token }
}

async function register(req: VercelRequest): Promise<{ user: Json; token: string }> {
  const { name, email, password } = readBody<{ name?: string; email?: string; password?: string }>(req)
  if (!name || !email || !password) throw new HttpError(400, 'Заполните имя, e-mail и пароль.')
  const mail = email.trim().toLowerCase()
  const exists = await sql.query('SELECT 1 FROM users WHERE email=$1', [mail])
  if (exists.rows.length) throw new HttpError(409, 'Пользователь с таким e-mail уже существует.')
  const id = `u-${Date.now().toString(36)}`
  await sql.query(
    `INSERT INTO users (id,name,email,role,kind,status,password_hash,"registeredAt","lastActiveAt","enrolledCourseIds","avgProgress")
     VALUES ($1,$2,$3,'Слушатель академии','student','active',$4,CURRENT_DATE,CURRENT_DATE,'[]'::jsonb,0)`,
    [id, name.trim(), mail, hashPassword(password)],
  )
  const user: Json = { id, name: name.trim(), email: mail, role: 'Слушатель академии', kind: 'student' }
  const token = signToken({ sub: id, kind: 'student', email: mail })
  return { user, token }
}

async function recover(req: VercelRequest): Promise<{ message: string }> {
  const { email } = readBody<{ email?: string }>(req)
  if (!email || !email.includes('@')) throw new HttpError(400, 'Укажите корректный e-mail.')
  // Реальная отправка письма — отдельный сервис; здесь — подтверждающее сообщение.
  return { message: `Инструкция по восстановлению доступа отправлена на ${email}.` }
}

async function me(req: VercelRequest): Promise<Json | null> {
  const auth = getAuth(req)
  if (!auth) return null
  const { rows } = await sql.query('SELECT id,name,email,role,kind FROM users WHERE id=$1', [auth.sub])
  return (rows[0] as Json) ?? null
}

// ---------- users ----------

async function setUserStatus(req: VercelRequest, id: string): Promise<unknown> {
  const { status } = readBody<{ status?: string }>(req)
  if (!status || !['active', 'invited', 'blocked'].includes(status)) {
    throw new HttpError(400, 'Недопустимый статус.')
  }
  await sql.query('UPDATE users SET status=$1 WHERE id=$2', [status, id])
  return getById('users', id)
}
