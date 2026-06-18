# Бэкенд МАБЛ (Vercel Functions + Postgres)

Бэкенд реализован как **одна serverless-функция-роутер** (`api/[...path].ts`) —
под лимит Vercel Hobby (одна функция вместо десятков). Данные — в **Postgres**
(`@vercel/postgres`). Авторизация — **JWT** (HS256), пароли — scrypt.

Фронтенд общается с бэкендом через слой `src/api/*`. Переключение mock → http
делается переменными окружения, без правок UI.

## Структура

```
api/
  [...path].ts        точка входа: /api/* → роутер
  _lib/
    routes.ts         все маршруты и обработчики
    db.ts             подключение @vercel/postgres
    auth.ts           JWT + хеширование паролей (node:crypto)
    http.ts           HttpError, чтение тела, проверка прав
  tsconfig.json       отдельный typecheck бэкенда (npm run typecheck:api)
db/
  schema.sql          схема БД
  migrate.ts          применение схемы (npm run db:migrate)
  seed.ts             наполнение демо-данными (npm run db:seed)
```

## Запуск (прод на Vercel)

1. **Создать БД**: в проекте Vercel → **Storage → Create Database → Postgres**
   (Neon). Vercel сам добавит переменную `POSTGRES_URL` в проект.
2. **Секрет JWT**: Project → Settings → Environment Variables →
   `JWT_SECRET` = длинная случайная строка.
3. **Переключить фронт на бэкенд**: добавить переменные
   `VITE_API_MODE=http` и `VITE_API_URL=/api`.
4. **Создать таблицы и залить данные** — двумя способами:

   **A. Через браузер (без локального Node)** — задать временную переменную
   `SETUP_SECRET` (любая случайная строка), сделать **Redeploy**, затем один раз
   вызвать эндпоинт настройки:
   ```bash
   curl -X POST "https://<домен>/api/setup?secret=<SETUP_SECRET>"
   ```
   Ответ — счётчики вставленных записей. После этого переменную `SETUP_SECRET`
   можно удалить.

   **B. Локально через CLI** (с `POSTGRES_URL` из Vercel):
   ```bash
   export POSTGRES_URL='postgres://...'
   npm run db:seed     # схема + демо-данные одной командой
   ```
5. **Redeploy** проекта (если меняли переменные). Готово — приложение на реальной БД.

Демо-вход после сида: `demo@mabl.ru / mabl2026`, `admin@mabl.ru / admin2026`.

## Контракт API

Все ответы — JSON. Защищённые методы требуют заголовок
`Authorization: Bearer <token>` (фронт подставляет автоматически).

| Метод | Путь | Доступ | Назначение |
|------|------|--------|-----------|
| POST | `/api/auth/login` | — | вход, возвращает `{ user, token }` |
| POST | `/api/auth/register` | — | регистрация слушателя |
| POST | `/api/auth/recover` | — | восстановление доступа |
| GET | `/api/auth/me` | токен | текущий пользователь |
| GET | `/api/courses` | — | список программ |
| GET | `/api/courses/:id` | — | программа |
| POST | `/api/courses` | admin | создать |
| PUT | `/api/courses/:id` | admin | обновить (частично/полностью) |
| DELETE | `/api/courses/:id` | admin | удалить |
| POST | `/api/courses/reset` | admin | сброс к демо-данным |
| GET | `/api/events`, `/api/events/next`, `/api/events/:id` | — | события |
| GET | `/api/news`, `/api/news/:id` | — | новости |
| GET | `/api/materials`, `/api/materials/:id` | — | материалы |
| GET | `/api/surveys`, `/api/surveys/:id` | — | опросники |
| GET | `/api/forum/sections`, `/api/forum/topics`, `/api/forum/{sections,topics}/:id` | — | форум |
| GET | `/api/notifications` | — | уведомления |
| GET | `/api/admin/users`, `/api/admin/users/:id` | admin | участники |
| PATCH | `/api/admin/users/:id/status` | admin | сменить статус |
| GET | `/api/admin/orders` | admin | заказы |
| GET | `/api/admin/scorm`, DELETE `/api/admin/scorm/:id` | admin | SCORM-пакеты (метаданные) |
| GET | `/api/me/access` | токен | доступные программы и события слушателя |
| POST | `/api/me/courses/:id/purchase` | токен | купить программу (создаёт заказ + доступ) |
| POST | `/api/me/events/:id/register` | токен | записаться на событие |
| POST | `/api/payments/webhook` | — | вебхук подтверждения оплаты (ЮKassa) |

## Платежи

Провайдер выбирается переменной `PAYMENT_PROVIDER`:
- `simulated` (по умолчанию) — оплата считается успешной сразу; заказ и доступ
  создаются настоящие (таблицы `orders`, `enrollments`). Удобно для демо/тестов.
- `yookassa` — реальный платёж: при покупке создаётся платёж в ЮKassa, пользователь
  редиректится на форму оплаты, после оплаты ЮKassa шлёт вебхук на
  `POST /api/payments/webhook`, который подтверждает заказ и открывает доступ
  (статус оплаты перепроверяется напрямую у ЮKassa).

Чтобы включить ЮKassa:
1. Env: `PAYMENT_PROVIDER=yookassa`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`.
2. В личном кабинете ЮKassa указать URL вебхука: `https://<домен>/api/payments/webhook`
   (события `payment.succeeded`).

Stripe/CloudPayments добавляются в `api/_lib/payments.ts` тем же интерфейсом.

## Что осталось вне этого среза

- **Хостинг SCORM на сервере** — пока загрузка/проигрывание на клиенте
  (Cache Storage + Service Worker). Серверный вариант = распаковка на бэкенде +
  объектное хранилище (Vercel Blob); таблица `scorm_packages` и эндпоинты уже есть.
