import { sql } from '@vercel/postgres'
import { courses } from '../src/data/courses'
import { events } from '../src/data/events'
import { news } from '../src/data/news'
import { materials } from '../src/data/materials'
import { surveys } from '../src/data/surveys'
import { forumSections, forumTopics } from '../src/data/forum'
import { notifications } from '../src/data/notifications'
import { adminUsers } from '../src/data/users'
import { orders } from '../src/data/orders'
import { hashPassword } from '../api/_lib/auth'

/**
 * Наполняет БД текущими демо-данными (теми же, что в src/data/*).
 * Запуск: POSTGRES_URL=... npm run db:seed
 *
 * Пароли задаются только демо-аккаунтам: demo@mabl.ru / admin@mabl.ru.
 */

// Пароли демо-аккаунтов (как на экране входа).
const PASSWORDS: Record<string, string> = {
  'demo@mabl.ru': 'mabl2026',
  'admin@mabl.ru': 'admin2026',
}

const J = (v: unknown) => JSON.stringify(v ?? null)

async function run() {
  await sql.query(
    'TRUNCATE courses, events, news, materials, surveys, forum_sections, forum_topics, notifications, users, orders, scorm_packages, enrollments, event_registrations',
  )

  for (let i = 0; i < courses.length; i += 1) {
    const c = courses[i]
    await sql.query(
      `INSERT INTO courses (id,title,subtitle,description,format,level,instructor,"durationHours","lessonsCount",price,progress,"surveyId",tags,modules,position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15)`,
      [c.id, c.title, c.subtitle, c.description, c.format, c.level, c.instructor, c.durationHours, c.lessonsCount, c.price, c.progress, c.surveyId ?? null, J(c.tags), J(c.modules), i + 1],
    )
  }

  for (const e of events) {
    await sql.query(
      `INSERT INTO events (id,title,type,date,"durationMin",speaker,location,description,price,registrable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [e.id, e.title, e.type, e.date, e.durationMin ?? null, e.speaker ?? null, e.location, e.description, e.price ?? null, e.registrable ?? false],
    )
  }

  for (const n of news) {
    await sql.query(
      `INSERT INTO news (id,title,excerpt,body,category,date,"readingTime",cover)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)`,
      [n.id, n.title, n.excerpt, J(n.body), n.category, n.date, n.readingTime, n.cover ?? null],
    )
  }

  for (const m of materials) {
    await sql.query(
      `INSERT INTO materials (id,title,description,type,size,date,"courseId",body)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [m.id, m.title, m.description, m.type, m.size, m.date, m.courseId ?? null, J(m.body ?? [])],
    )
  }

  for (const s of surveys) {
    await sql.query(
      `INSERT INTO surveys (id,title,description,questions,"relatedCourseId")
       VALUES ($1,$2,$3,$4::jsonb,$5)`,
      [s.id, s.title, s.description, J(s.questions), s.relatedCourseId ?? null],
    )
  }

  for (const s of forumSections) {
    await sql.query(
      `INSERT INTO forum_sections (id,title,description,"topicsCount") VALUES ($1,$2,$3,$4)`,
      [s.id, s.title, s.description, s.topicsCount],
    )
  }

  for (const t of forumTopics) {
    await sql.query(
      `INSERT INTO forum_topics (id,"sectionId",title,author,date,body,comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [t.id, t.sectionId, t.title, t.author, t.date, t.body, J(t.comments)],
    )
  }

  for (const n of notifications) {
    await sql.query(
      `INSERT INTO notifications (id,kind,title,text,date,read,href)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [n.id, n.kind, n.title, n.text, n.date, n.read, n.href ?? null],
    )
  }

  for (const u of adminUsers) {
    const pwd = PASSWORDS[u.email] ? hashPassword(PASSWORDS[u.email]) : null
    // В AdminUser.role хранится уровень доступа; в БД role — должность, kind — уровень.
    const kind = u.role
    const displayRole = kind === 'admin' ? 'Администратор платформы' : 'Слушатель академии'
    await sql.query(
      `INSERT INTO users (id,name,email,role,kind,status,password_hash,"registeredAt","lastActiveAt","enrolledCourseIds","avgProgress")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
      [u.id, u.name, u.email, displayRole, kind, u.status, pwd, u.registeredAt, u.lastActiveAt, J(u.enrolledCourseIds), u.avgProgress],
    )
  }

  for (const o of orders) {
    await sql.query(
      `INSERT INTO orders (id,"userId","courseId",amount,date,status,method)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [o.id, o.userId, o.courseId, o.amount, o.date, o.status, o.method],
    )
  }

  // Доступ к программам — из enrolledCourseIds участников.
  for (const u of adminUsers) {
    for (const courseId of u.enrolledCourseIds) {
      await sql.query(
        `INSERT INTO enrollments ("userId","courseId") VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [u.id, courseId],
      )
    }
  }

  console.log('✓ База наполнена демо-данными')
  console.log(`  курсы: ${courses.length}, события: ${events.length}, новости: ${news.length}`)
  console.log(`  материалы: ${materials.length}, опросники: ${surveys.length}, пользователи: ${adminUsers.length}, заказы: ${orders.length}`)
  console.log('  Демо-вход: demo@mabl.ru / mabl2026 · admin@mabl.ru / admin2026')
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
