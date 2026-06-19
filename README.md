# МАБЛ · LMS-платформа

LMS-сайт **Международной академии бизнес лидерства (МАБЛ)** на React + Vite +
TypeScript. Визуальная айдентика строго по бренд-гайду `MABL_GUIDE.pdf`:
цвета Нефть / Океан / Мудрость, герб и логотип академии, шрифт TT Rationalist,
академический премиум-минимализм.

## Технологии

- **React 18** + **TypeScript** (strict)
- **Vite 5**
- **React Router 6**
- **Tailwind CSS 3** (брендовые токены в `tailwind.config.js`)
- **Mock-данные** вместо бэкенда (`src/data/*`)

## Быстрый старт

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # сборка в dist/
npm run preview  # предпросмотр прод-сборки
```

### Демо-доступ в личный кабинет

```
E-mail:  demo@mabl.ru
Пароль:  mabl2026
```

(на странице `/login` есть кнопка «Подставить данные»)

## Брендинг

| Токен | Значение | Использование |
|-------|----------|---------------|
| Нефть | `#212128` | тёмные плоскости, шапка ЛК, подвал |
| Океан | `#3552AF` | акценты, кнопки, прогресс |
| Мудрость | `#FFFFFF` | основной фон (эталонная среда логотипа) |

- **Шрифт:** TT Rationalist (см. раздел ниже).
- **Логотип:** герб и полная горизонтальная версия (`public/brand/`),
  извлечены из бренд-гайда.
- **Паттерн:** фирменный паттерн как едва заметная текстура (`brand-pattern`).
- Design tokens продублированы в `src/theme/tokens.ts` (colors, typography,
  spacing, radius).

### Шрифт TT Rationalist

TT Rationalist — коммерческий шрифт (TypeType), файлы не включены в репозиторий
по лицензии. Положите лицензионные `.woff2` в `public/fonts/` с именами из
`src/styles/fonts.css` (см. `public/fonts/README.md`). До этого используется
серифный fallback (Georgia), близкий по строю — вёрстка остаётся академичной.

## Маршруты

| Путь | Страница |
|------|----------|
| `/` | Публичная главная (позиционирование, ближайший вебинар, курсы, новости) |
| `/login` | Авторизация + восстановление доступа (mock) |
| `/checkout` | Оформление и mock-оплата курса |
| `/dashboard` | Личный кабинет (прогресс, курсы, события, уведомления) |
| `/courses`, `/courses/:id` | Каталог с фильтрами и страница курса |
| `/materials`, `/materials/:id` | Библиотека материалов |
| `/news`, `/news/:id` | Новости с категориями |
| `/forum`, `/forum/:id` | Форум: разделы, темы, комментарии (mock) |
| `/calendar` | Календарь: вебинары, дедлайны, мероприятия + запись |
| `/surveys`, `/surveys/:id` | Опросники (один/несколько вариантов, шкала 1–5, текст) |
| `/notifications` | Центр уведомлений |

`/dashboard` и `/notifications` защищены — без входа редирект на `/login`.

### Админ-панель (`/admin`, только роль `admin`)

| Путь | Раздел |
|------|--------|
| `/admin` | Обзор платформы |
| `/admin/courses` | Программы (создание, редактирование, удаление) |
| `/admin/events` | События и вебинары (создание, редактирование, удаление) |
| `/admin/news` | Новости (создание, редактирование, удаление) |
| `/admin/forum` | Форум: разделы и темы (создание, удаление) |
| `/admin/users`, `/admin/orders`, `/admin/scorm`, `/admin/database` | Управление платформой |

Демо-заглушки новостей, форума и событий убраны: разделы начинают работу
пустыми, а контент создаётся администратором из соответствующих разделов
панели. В mock-режиме данные сохраняются в `localStorage`.

## Архитектура

```
src/
├── components/
│   ├── ui/          Button, Card, Input, Badge, ProgressBar, Section, Icon
│   ├── layout/      Header, Footer, Sidebar, PublicLayout, AppLayout
│   ├── brand/       Crest (герб), Logo
│   ├── CourseCard, EventCard, NotificationItem
├── context/         AuthContext, PurchaseContext, NotificationsContext
├── data/            courses, news, materials, events, notifications, forum, surveys
├── lib/             utils, payments (абстракция платёжки), labels
├── pages/           по странице на маршрут
├── theme/tokens.ts  design tokens
├── types/           доменные типы
└── styles/fonts.css @font-face TT Rationalist
```

### Платежи (готовность к production)

UI работает с интерфейсом `PaymentProvider` (`src/lib/payments.ts`) и не знает о
конкретном шлюзе. Сейчас используется `mockPaymentProvider`. Для боевой оплаты —
реализуйте `PaymentProvider` (ЮKassa / Stripe / CloudPayments) и подставьте его в
`PurchaseContext`/`CheckoutPage`. Логика открытия доступа уже отделена от платежа.

## Деплой на Vercel

В репозитории есть `vercel.json` (framework: vite, SPA-rewrites). Варианты:

1. **Через дашборд:** импортируйте репозиторий на vercel.com → Vercel сам
   определит Vite. Build: `npm run build`, Output: `dist`.
2. **Через CLI:**
   ```bash
   npm i -g vercel
   vercel        # preview-деплой
   vercel --prod # продакшен
   ```

SPA-роутинг покрыт rewrite-правилом на `index.html`.

## Что осталось подключить для production

- Реальный бэкенд/API вместо `src/data/*` (курсы, новости, события и т.д.).
- Боевая авторизация (JWT/сессии) вместо mock `AuthContext`.
- Платёжный провайдер (реализация `PaymentProvider`).
- Хостинг видео и встраивание SCORM-пакетов (сейчас — плейсхолдеры).
- Лицензионные файлы шрифта TT Rationalist в `public/fonts/`.
- Сохранение ответов опросов, комментариев форума и записей на события на сервере.

---

© МАБЛ · Sapere · Ducere — Знать, чтобы лидировать
