import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = req.query.secret as string
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL

  if (!connectionString) {
    return res.status(500).json({ error: 'No database connection string found' })
  }

  const sql = neon(connectionString)

  try {
    // --- Таблицы ---
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        format TEXT NOT NULL,
        level TEXT NOT NULL,
        instructor TEXT,
        duration_hours INT DEFAULT 0,
        lessons_count INT DEFAULT 0,
        price INT DEFAULT 0,
        tags TEXT[] DEFAULT '{}',
        survey_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS course_modules (
        id TEXT PRIMARY KEY,
        course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        sort_order INT DEFAULT 0
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        module_id TEXT REFERENCES course_modules(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        format TEXT NOT NULL,
        duration TEXT,
        sort_order INT DEFAULT 0
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS user_progress (
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
        progress INT DEFAULT 0,
        completed_lesson_ids TEXT[] DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, course_id)
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        amount INT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        date TIMESTAMPTZ NOT NULL,
        duration_min INT,
        speaker TEXT,
        location TEXT,
        description TEXT,
        price INT DEFAULT 0,
        registrable BOOLEAN DEFAULT FALSE
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        excerpt TEXT,
        body JSONB DEFAULT '[]',
        category TEXT,
        date DATE,
        reading_time TEXT,
        cover TEXT
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        size TEXT,
        date DATE,
        course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
        body JSONB DEFAULT '[]'
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS surveys (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        related_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS survey_questions (
        id TEXT PRIMARY KEY,
        survey_id TEXT REFERENCES surveys(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        options JSONB DEFAULT '[]',
        required BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS forum_sections (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        topics_count INT DEFAULT 0
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS forum_topics (
        id TEXT PRIMARY KEY,
        section_id TEXT REFERENCES forum_sections(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        author TEXT,
        date TIMESTAMPTZ DEFAULT NOW(),
        body TEXT
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS forum_comments (
        id TEXT PRIMARY KEY,
        topic_id TEXT REFERENCES forum_topics(id) ON DELETE CASCADE,
        author TEXT,
        date TIMESTAMPTZ DEFAULT NOW(),
        text TEXT
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        text TEXT,
        date TIMESTAMPTZ DEFAULT NOW(),
        read BOOLEAN DEFAULT FALSE,
        href TEXT
      )
    `

    // --- Сидирование ---

    // Администратор
    await sql`
      INSERT INTO users (id, name, email, role, password_hash)
      VALUES (
        'admin-001',
        'Администратор МАБЛ',
        'admin@mabl.ru',
        'admin',
        '$2b$10$YourHashedPasswordHere'
      )
      ON CONFLICT (id) DO NOTHING
    `

    // Тестовый студент
    await sql`
      INSERT INTO users (id, name, email, role, password_hash)
      VALUES (
        'student-001',
        'Иван Петров',
        'student@mabl.ru',
        'student',
        '$2b$10$YourHashedPasswordHere'
      )
      ON CONFLICT (id) DO NOTHING
    `

    // Курсы
    await sql`
      INSERT INTO courses (id, title, subtitle, description, format, level, instructor, duration_hours, lessons_count, price, tags, survey_id)
      VALUES
        ('strategic-leadership', 'Стратегическое лидерство', 'Управление через смысл и видение',
         'Программа для руководителей, формирующих стратегию в условиях неопределённости.',
         'video', 'Продвинутый', 'проф. Анна Корецкая', 24, 18, 48000,
         ARRAY['Лидерство','Стратегия','Управление'], 'course-feedback'),
        ('corporate-finance', 'Корпоративные финансы', 'Финансовое мышление руководителя',
         'Курс раскрывает логику финансовых решений: от оценки инвестиций до управления стоимостью компании.',
         'longread', 'Базовый', 'к.э.н. Дмитрий Воронов', 16, 14, 36000,
         ARRAY['Финансы','Инвестиции','Оценка бизнеса'], NULL),
        ('negotiation-mastery', 'Мастерство переговоров', 'Власть, доверие и результат',
         'Интенсивный курс по переговорным стратегиям: от подготовки сценариев до работы в жёстких условиях.',
         'scorm', 'Продвинутый', 'проф. Игорь Мельник', 12, 10, 42000,
         ARRAY['Переговоры','Коммуникация','Влияние'], NULL),
        ('hr-analytics', 'HR-аналитика', 'Данные как инструмент управления людьми',
         'Практический курс по работе с HR-данными: от метрик вовлечённости до предиктивных моделей.',
         'video', 'Базовый', 'к.п.н. Мария Сорокина', 20, 16, 32000,
         ARRAY['HR','Аналитика','Данные'], NULL),
        ('change-management', 'Управление изменениями', 'Трансформация без сопротивления',
         'Методология проведения организационных изменений с минимальным сопротивлением.',
         'longread', 'Экспертный', 'д.э.н. Сергей Громов', 28, 22, 54000,
         ARRAY['Изменения','Трансформация','Организация'], NULL),
        ('executive-communication', 'Коммуникации руководителя', 'Слово как инструмент власти',
         'Публичные выступления, работа с аудиторией и личный бренд лидера.',
         'video', 'Базовый', 'Наталья Белова, MBA', 10, 8, 28000,
         ARRAY['Коммуникация','Публичность','Бренд'], NULL)
      ON CONFLICT (id) DO NOTHING
    `

    // События
    await sql`
      INSERT INTO events (id, title, type, date, duration_min, speaker, location, description, price, registrable)
      VALUES
        ('webinar-strategic-thinking', 'Вебинар «Стратегическое мышление руководителя»',
         'Вебинар', '2026-06-19T18:00:00Z', 90, 'проф. Анна Корецкая', 'Онлайн · Zoom',
         'Открытый вебинар о принятии решений в условиях неопределённости.', 0, TRUE),
        ('webinar-negotiations', 'Мастер-класс «Переговоры под давлением»',
         'Вебинар', '2026-06-24T19:00:00Z', 120, 'проф. Игорь Мельник', 'Онлайн · Zoom',
         'Практический мастер-класс по управлению эмоциональным полем переговоров.', 4900, TRUE),
        ('deadline-finance-module', 'Дедлайн: модуль «Инвестиционные решения»',
         'Дедлайн', '2026-06-27T23:59:00Z', NULL, NULL, 'Курс «Корпоративные финансы»',
         'Срок сдачи практического задания по второму модулю курса.', 0, FALSE),
        ('leaders-forum', 'Форум лидеров МАБЛ 2026',
         'Мероприятие', '2026-07-05T10:00:00Z', 480, NULL, 'Москва, Центр международной торговли',
         'Ежегодный форум выпускников и слушателей МАБЛ.', 0, TRUE)
      ON CONFLICT (id) DO NOTHING
    `

    // Новости
    await sql`
      INSERT INTO news (id, title, excerpt, body, category, date, reading_time)
      VALUES
        ('new-academic-year', 'МАБЛ открывает академический сезон 2026/27',
         'Новые программы по стратегическому лидерству, расширенный преподавательский состав и обновлённая платформа.',
         '["МАБЛ объявляет о старте нового академического сезона. В программе — шесть флагманских курсов, серия закрытых вебинаров и расширенная библиотека материалов.","Ключевой акцент сезона — практико-ориентированное обучение: интерактивные SCORM-симуляторы, разбор реальных кейсов и индивидуальная обратная связь от преподавателей.","Регистрация для слушателей уже открыта в личном кабинете. Количество мест на флагманских программах ограничено."]'::JSONB,
         'Академия', '2026-06-10', '4 мин'),
        ('webinar-strategic-thinking', 'Открытый вебинар: «Стратегическое мышление руководителя»',
         'Бесплатный вебинар с профессором Анной Корецкой.',
         '["Приглашаем на открытый вебинар, посвящённый стратегическому мышлению. Профессор Анна Корецкая расскажет о фреймворках принятия решений и работе с долгосрочным видением.","Вебинар пройдёт онлайн, для участников предусмотрена сессия вопросов и ответов."]'::JSONB,
         'Вебинары', '2026-06-05', '3 мин'),
        ('scorm-update', 'Обновление SCORM-симуляторов в курсах МАБЛ',
         'Все интерактивные модули переведены на новую платформу с улучшенной аналитикой.',
         '["Технический апдейт: SCORM-симуляторы в курсах «Переговоры» и «Лидерство» обновлены. Новые версии работают стабильнее, поддерживают сохранение прогресса между сессиями.","Слушателям, которые не завершили интерактивные модули, рекомендуем перезапустить их."]'::JSONB,
         'Курсы', '2026-05-28', '2 мин')
      ON CONFLICT (id) DO NOTHING
    `

    // Материалы
    await sql`
      INSERT INTO materials (id, title, description, type, size, date, course_id)
      VALUES
        ('checklist-leadership', 'Чек-лист лидера: 12 практик', 'Сжатый инструментарий для ежедневного использования руководителем.', 'Чек-лист', '0.3 МБ', '2026-06-01', 'strategic-leadership'),
        ('template-finance-model', 'Шаблон финансовой модели', 'Excel-шаблон для оценки инвестиционного проекта.', 'Шаблон', '1.2 МБ', '2026-05-20', 'corporate-finance'),
        ('presentation-negotiations', 'Презентация: Матрица переговорных позиций', 'Визуальный инструмент для подготовки к переговорам.', 'Презентация', '2.4 МБ', '2026-05-15', 'negotiation-mastery'),
        ('pdf-hr-metrics', 'Гайд по HR-метрикам', 'Полный справочник показателей управления персоналом.', 'PDF', '3.1 МБ', '2026-04-30', 'hr-analytics')
      ON CONFLICT (id) DO NOTHING
    `

    // Секции форума
    await sql`
      INSERT INTO forum_sections (id, title, description, topics_count)
      VALUES
        ('strategy', 'Стратегия и лидерство', 'Обсуждение стратегических вопросов управления', 12),
        ('finance', 'Финансы и инвестиции', 'Финансовые инструменты и практики', 8),
        ('hr', 'HR и управление людьми', 'Вопросы управления персоналом', 15),
        ('negotiations', 'Переговоры и коммуникации', 'Переговорные кейсы и практики', 6)
      ON CONFLICT (id) DO NOTHING
    `

    // Опросник
    await sql`
      INSERT INTO surveys (id, title, description, related_course_id)
      VALUES
        ('course-feedback', 'Обратная связь по курсу', 'Помогите нам сделать курс лучше', 'strategic-leadership')
      ON CONFLICT (id) DO NOTHING
    `

    await sql`
      INSERT INTO survey_questions (id, survey_id, type, title, options, required, sort_order)
      VALUES
        ('q1', 'course-feedback', 'single', 'Как вы оцениваете качество материала?',
         '["Отлично","Хорошо","Удовлетворительно","Плохо"]'::JSONB, TRUE, 1),
        ('q2', 'course-feedback', 'scale', 'Насколько курс был полезен для вашей работы?',
         '[]'::JSONB, TRUE, 2),
        ('q3', 'course-feedback', 'text', 'Что бы вы хотели улучшить?',
         '[]'::JSONB, FALSE, 3)
      ON CONFLICT (id) DO NOTHING
    `

    // Подсчёт
    const [{ count: usersCount }] = await sql`SELECT COUNT(*) FROM users`
    const [{ count: coursesCount }] = await sql`SELECT COUNT(*) FROM courses`
    const [{ count: eventsCount }] = await sql`SELECT COUNT(*) FROM events`
    const [{ count: newsCount }] = await sql`SELECT COUNT(*) FROM news`

    return res.status(200).json({
      ok: true,
      message: 'База данных инициализирована',
      counts: {
        users: Number(usersCount),
        courses: Number(coursesCount),
        events: Number(eventsCount),
        news: Number(newsCount),
      },
    })
  } catch (err: unknown) {
    console.error('Setup error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
}
