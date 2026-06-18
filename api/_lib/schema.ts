/**
 * Схема БД как TS-константа — чтобы её видела serverless-функция /api/setup
 * (доступ к файлам в рантайме функции ограничен). Источник истины по схеме.
 * Имена колонок в camelCase (в кавычках) совпадают с типами фронтенда.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS courses (
  id text PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  description text,
  format text,
  level text,
  instructor text,
  "durationHours" integer,
  "lessonsCount" integer,
  price integer,
  progress integer,
  "surveyId" text,
  tags jsonb DEFAULT '[]'::jsonb,
  modules jsonb DEFAULT '[]'::jsonb,
  position integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  title text,
  type text,
  date timestamptz,
  "durationMin" integer,
  speaker text,
  location text,
  description text,
  price integer,
  registrable boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS news (
  id text PRIMARY KEY,
  title text,
  excerpt text,
  body jsonb DEFAULT '[]'::jsonb,
  category text,
  date date,
  "readingTime" text,
  cover text
);

CREATE TABLE IF NOT EXISTS materials (
  id text PRIMARY KEY,
  title text,
  description text,
  type text,
  size text,
  date date,
  "courseId" text,
  body jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS surveys (
  id text PRIMARY KEY,
  title text,
  description text,
  questions jsonb DEFAULT '[]'::jsonb,
  "relatedCourseId" text
);

CREATE TABLE IF NOT EXISTS forum_sections (
  id text PRIMARY KEY,
  title text,
  description text,
  "topicsCount" integer
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id text PRIMARY KEY,
  "sectionId" text,
  title text,
  author text,
  date date,
  body text,
  comments jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  kind text,
  title text,
  text text,
  date timestamptz,
  read boolean DEFAULT false,
  href text
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text,
  email text UNIQUE,
  role text,
  kind text,
  status text,
  password_hash text,
  "registeredAt" date,
  "lastActiveAt" date,
  "enrolledCourseIds" jsonb DEFAULT '[]'::jsonb,
  "avgProgress" integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  "userId" text,
  "courseId" text,
  amount integer,
  date date,
  status text,
  method text
);

CREATE TABLE IF NOT EXISTS scorm_packages (
  id text PRIMARY KEY,
  title text,
  "launchUrl" text,
  "fileCount" integer,
  "uploadedAt" timestamptz
);

CREATE TABLE IF NOT EXISTS enrollments (
  "userId" text,
  "courseId" text,
  "createdAt" timestamptz DEFAULT now(),
  PRIMARY KEY ("userId", "courseId")
);

CREATE TABLE IF NOT EXISTS event_registrations (
  "userId" text,
  "eventId" text,
  "createdAt" timestamptz DEFAULT now(),
  PRIMARY KEY ("userId", "eventId")
);
`
