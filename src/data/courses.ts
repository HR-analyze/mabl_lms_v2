import type { Course } from '@/types'

// Mock-данные курсов. В продакшене заменяются ответом API.
export const courses: Course[] = [
  {
    id: 'strategic-leadership',
    title: 'Стратегическое лидерство',
    subtitle: 'Управление через смысл и видение',
    description:
      'Программа для руководителей, формирующих стратегию в условиях неопределённости. Системный подход к принятию решений, работа с командой и масштабирование управленческого влияния.',
    format: 'video',
    level: 'Продвинутый',
    instructor: 'проф. Анна Корецкая',
    durationHours: 24,
    lessonsCount: 18,
    price: 48000,
    progress: 42,
    surveyId: 'course-feedback',
    tags: ['Лидерство', 'Стратегия', 'Управление'],
    modules: [
      {
        id: 'm1',
        title: 'Модуль 1. Природа лидерства',
        lessons: [
          { id: 'l1', title: 'Лидерство как практика', format: 'video', duration: '18 мин', completed: true },
          { id: 'l2', title: 'Видение и стратегический горизонт', format: 'video', duration: '22 мин', completed: true },
          { id: 'l3', title: 'Лонгрид: школы лидерства', format: 'longread', duration: '15 мин', completed: true },
        ],
      },
      {
        id: 'm2',
        title: 'Модуль 2. Принятие решений',
        lessons: [
          { id: 'l4', title: 'Модели принятия решений', format: 'video', duration: '26 мин', completed: true },
          { id: 'l5', title: 'Интерактив: кейс-симулятор', format: 'scorm', duration: '40 мин' },
          { id: 'l6', title: 'Когнитивные искажения', format: 'longread', duration: '12 мин' },
        ],
      },
      {
        id: 'm3',
        title: 'Модуль 3. Масштаб влияния',
        lessons: [
          { id: 'l7', title: 'Делегирование и доверие', format: 'video', duration: '20 мин' },
          { id: 'l8', title: 'Управление изменениями', format: 'video', duration: '24 мин' },
        ],
      },
    ],
  },
  {
    id: 'corporate-finance',
    title: 'Корпоративные финансы',
    subtitle: 'Финансовое мышление руководителя',
    description:
      'Курс раскрывает логику финансовых решений: от оценки инвестиций до управления стоимостью компании. Практические инструменты для нефинансовых менеджеров.',
    format: 'longread',
    level: 'Базовый',
    instructor: 'к.э.н. Дмитрий Воронов',
    durationHours: 16,
    lessonsCount: 14,
    price: 36000,
    progress: 0,
    tags: ['Финансы', 'Аналитика'],
    modules: [
      {
        id: 'm1',
        title: 'Модуль 1. Язык финансов',
        lessons: [
          { id: 'l1', title: 'Финансовая отчётность', format: 'longread', duration: '14 мин' },
          { id: 'l2', title: 'Ключевые показатели', format: 'longread', duration: '12 мин' },
        ],
      },
      {
        id: 'm2',
        title: 'Модуль 2. Инвестиционные решения',
        lessons: [
          { id: 'l3', title: 'Стоимость денег во времени', format: 'video', duration: '19 мин' },
          { id: 'l4', title: 'Оценка проектов: NPV, IRR', format: 'longread', duration: '16 мин' },
        ],
      },
    ],
  },
  {
    id: 'negotiations',
    title: 'Переговоры высокого уровня',
    subtitle: 'Архитектура договорённостей',
    description:
      'Интерактивная программа по переговорам: подготовка, работа с интересами сторон, управление эмоциональным полем и закрытие сделок в сложных условиях.',
    format: 'scorm',
    level: 'Продвинутый',
    instructor: 'проф. Игорь Мельник',
    durationHours: 20,
    lessonsCount: 12,
    price: 42000,
    progress: 0,
    surveyId: 'webinar-nps',
    tags: ['Переговоры', 'Коммуникация'],
    modules: [
      {
        id: 'm1',
        title: 'Модуль 1. Подготовка',
        lessons: [
          { id: 'l1', title: 'Карта интересов', format: 'scorm', duration: '35 мин' },
          { id: 'l2', title: 'BATNA и зона согласия', format: 'video', duration: '21 мин' },
        ],
      },
      {
        id: 'm2',
        title: 'Модуль 2. За столом переговоров',
        lessons: [
          { id: 'l3', title: 'Тактики и контртактики', format: 'scorm', duration: '45 мин' },
          { id: 'l4', title: 'Управление давлением', format: 'video', duration: '18 мин' },
        ],
      },
    ],
  },
  {
    id: 'digital-transformation',
    title: 'Цифровая трансформация',
    subtitle: 'Управление технологическими изменениями',
    description:
      'Как руководителю выстроить цифровую повестку: данные, продукты, культура и операционная модель компании в эпоху технологического ускорения.',
    format: 'video',
    level: 'Экспертный',
    instructor: 'проф. Елена Савина',
    durationHours: 28,
    lessonsCount: 22,
    price: 56000,
    progress: 0,
    tags: ['Цифра', 'Стратегия', 'Данные'],
    modules: [
      {
        id: 'm1',
        title: 'Модуль 1. Цифровая стратегия',
        lessons: [
          { id: 'l1', title: 'Зрелость и диагностика', format: 'video', duration: '23 мин' },
          { id: 'l2', title: 'Данные как актив', format: 'longread', duration: '17 мин' },
        ],
      },
      {
        id: 'm2',
        title: 'Модуль 2. Операционная модель',
        lessons: [
          { id: 'l3', title: 'Продуктовые команды', format: 'video', duration: '20 мин' },
          { id: 'l4', title: 'Симулятор трансформации', format: 'scorm', duration: '50 мин' },
        ],
      },
    ],
  },
  {
    id: 'public-speaking',
    title: 'Публичные выступления',
    subtitle: 'Голос лидера',
    description:
      'Структура выступления, работа с аудиторией, сторителлинг и управление вниманием. Курс с большим объёмом видеопрактики и обратной связи.',
    format: 'video',
    level: 'Базовый',
    instructor: 'Мария Лаврова',
    durationHours: 12,
    lessonsCount: 10,
    price: 28000,
    progress: 0,
    tags: ['Коммуникация', 'Презентации'],
    modules: [
      {
        id: 'm1',
        title: 'Модуль 1. Структура',
        lessons: [
          { id: 'l1', title: 'Композиция речи', format: 'video', duration: '16 мин' },
          { id: 'l2', title: 'Истории, которые убеждают', format: 'video', duration: '19 мин' },
        ],
      },
    ],
  },
  {
    id: 'org-psychology',
    title: 'Организационная психология',
    subtitle: 'Команды, мотивация, культура',
    description:
      'Психология управления: динамика команд, мотивация, конфликты и формирование сильной организационной культуры на основе доказательного подхода.',
    format: 'longread',
    level: 'Продвинутый',
    instructor: 'к.пс.н. Ольга Дронова',
    durationHours: 18,
    lessonsCount: 16,
    price: 39000,
    progress: 0,
    tags: ['Команды', 'Психология', 'Культура'],
    modules: [
      {
        id: 'm1',
        title: 'Модуль 1. Динамика команд',
        lessons: [
          { id: 'l1', title: 'Стадии развития команды', format: 'longread', duration: '13 мин' },
          { id: 'l2', title: 'Роли и доверие', format: 'video', duration: '18 мин' },
        ],
      },
    ],
  },
]

export const getCourseById = (id: string): Course | undefined =>
  courses.find((c) => c.id === id)
