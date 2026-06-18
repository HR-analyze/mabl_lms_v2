import { sql } from './db'
import { SCHEMA_SQL } from './schema'
import { hashPassword } from './auth'
import { courses } from '../../src/data/courses'
import { events } from '../../src/data/events'
import { news } from '../../src/data/news'
import { materials } from '../../src/data/materials'
import { surveys } from '../../src/data/surveys'
import { forumSections, forumTopics } from '../../src/data/forum'
import { notifications } from '../../src/data/notifications'
import { adminUsers } from '../../src/data/users'
import { orders } from '../../src/data/orders'

/** Пароли демо-аккаунтов (как на экране входа). */
const PASSWORDS: Record<string, string> = {
  'demo@mabl.ru': 'mabl2026',
  'admin@mabl.ru': 'admin2026',
}

type Row = Record<string, unknown>

function quoteCol(col: string): string {
  return /[A-Z]/.test(col) ? `"${col}"` : col
}

/** Пакетная вставка (одним запросом) — экономит сетевые round-trip. */
async function bulkInsert(
  table: string,
  cols: string[],
  rows: readonly unknown[],
  jsonbCols = new Set<string>(),
) {
  if (rows.length === 0) return
  const params: unknown[] = []
  const groups = rows.map((raw) => {
    const row = raw as Row
    const placeholders = cols.map((col) => {
      const value = row[col]
      if (jsonbCols.has(col)) {
        params.push(JSON.stringify(value ?? null))
        return `$${params.length}::jsonb`
      }
      params.push(value ?? null)
      return `$${params.length}`
    })
    return `(${placeholders.join(',')})`
  })
  const colList = cols.map(quoteCol).join(',')
  await sql.query(`INSERT INTO ${table} (${colList}) VALUES ${groups.join(',')}`, params)
}

/** Создать таблицы (идемпотентно). */
export async function applySchema(): Promise<number> {
  const statements = SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)
  for (const statement of statements) {
    await sql.query(statement)
  }
  return statements.length
}

/** Заполнить БД демо-данными (идемпотентно: сначала TRUNCATE). */
export async function seedData() {
  await sql.query(
    'TRUNCATE courses, events, news, materials, surveys, forum_sections, forum_topics, notifications, users, orders, scorm_packages, enrollments, event_registrations',
  )

  await bulkInsert(
    'courses',
    ['id', 'title', 'subtitle', 'description', 'format', 'level', 'instructor', 'durationHours', 'lessonsCount', 'price', 'progress', 'surveyId', 'tags', 'modules', 'position'],
    courses.map((c, i) => ({ ...c, surveyId: c.surveyId ?? null, position: i + 1 })),
    new Set(['tags', 'modules']),
  )

  await bulkInsert(
    'events',
    ['id', 'title', 'type', 'date', 'durationMin', 'speaker', 'location', 'description', 'price', 'registrable'],
    events.map((e) => ({ ...e, durationMin: e.durationMin ?? null, speaker: e.speaker ?? null, price: e.price ?? null, registrable: e.registrable ?? false })),
  )

  await bulkInsert('news',
    ['id', 'title', 'excerpt', 'body', 'category', 'date', 'readingTime', 'cover'],
    news.map((n) => ({ ...n, cover: n.cover ?? null })),
    new Set(['body']),
  )

  await bulkInsert('materials',
    ['id', 'title', 'description', 'type', 'size', 'date', 'courseId', 'body'],
    materials.map((m) => ({ ...m, courseId: m.courseId ?? null, body: m.body ?? [] })),
    new Set(['body']),
  )

  await bulkInsert('surveys',
    ['id', 'title', 'description', 'questions', 'relatedCourseId'],
    surveys.map((s) => ({ ...s, relatedCourseId: s.relatedCourseId ?? null })),
    new Set(['questions']),
  )

  await bulkInsert('forum_sections',
    ['id', 'title', 'description', 'topicsCount'], forumSections)

  await bulkInsert('forum_topics',
    ['id', 'sectionId', 'title', 'author', 'date', 'body', 'comments'],
    forumTopics, new Set(['comments']),
  )

  await bulkInsert('notifications',
    ['id', 'kind', 'title', 'text', 'date', 'read', 'href'],
    notifications.map((n) => ({ ...n, href: n.href ?? null })),
  )

  await bulkInsert('users',
    ['id', 'name', 'email', 'role', 'kind', 'status', 'password_hash', 'registeredAt', 'lastActiveAt', 'enrolledCourseIds', 'avgProgress'],
    adminUsers.map((u) => ({
      id: u.id, name: u.name, email: u.email,
      role: u.role === 'admin' ? 'Администратор платформы' : 'Слушатель академии',
      kind: u.role, status: u.status,
      password_hash: PASSWORDS[u.email] ? hashPassword(PASSWORDS[u.email]) : null,
      registeredAt: u.registeredAt, lastActiveAt: u.lastActiveAt,
      enrolledCourseIds: u.enrolledCourseIds, avgProgress: u.avgProgress,
    })),
    new Set(['enrolledCourseIds']),
  )

  await bulkInsert('orders',
    ['id', 'userId', 'courseId', 'amount', 'date', 'status', 'method'], orders)

  const enrollments: Row[] = []
  for (const u of adminUsers) {
    for (const courseId of u.enrolledCourseIds) enrollments.push({ userId: u.id, courseId })
  }
  await bulkInsert('enrollments', ['userId', 'courseId'], enrollments)

  return {
    courses: courses.length,
    events: events.length,
    news: news.length,
    materials: materials.length,
    surveys: surveys.length,
    users: adminUsers.length,
    orders: orders.length,
    enrollments: enrollments.length,
  }
}

/** Полная настройка: схема + данные. */
export async function runSetup() {
  await applySchema()
  const counts = await seedData()
  return counts
}
