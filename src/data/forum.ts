import type { ForumSection, ForumTopic } from '@/types'

export const forumSections: ForumSection[] = [
  {
    id: 'leadership',
    title: 'Лидерство и стратегия',
    description: 'Обсуждение управленческих практик, стратегий и кейсов.',
    topicsCount: 12,
  },
  {
    id: 'finance',
    title: 'Финансы и аналитика',
    description: 'Вопросы корпоративных финансов, метрик и инвестиций.',
    topicsCount: 8,
  },
  {
    id: 'community',
    title: 'Сообщество МАБЛ',
    description: 'Нетворкинг, события и общие вопросы слушателей.',
    topicsCount: 21,
  },
]

export const forumTopics: ForumTopic[] = [
  {
    id: 'growth-strategy',
    sectionId: 'leadership',
    title: 'Как выбрать стратегию роста для зрелой компании?',
    author: 'Анна Петрова',
    date: '2026-06-11T12:00:00',
    body:
      'Коллеги, делюсь дилеммой: компания на плато, органический рост замедлился. Рассматриваем M&A и выход в смежные ниши. Как принимали подобные решения вы?',
    comments: [
      {
        id: 'c1',
        author: 'Дмитрий Воронов',
        date: '2026-06-13T16:40:00',
        text: 'Начните с честной диагностики ядра бизнеса. Часто «плато» — это вопрос операционной модели, а не рынка.',
      },
      {
        id: 'c2',
        author: 'Игорь Мельник',
        date: '2026-06-14T09:10:00',
        text: 'M&A без культурной интеграции редко окупается. Считайте не только синергию, но и риск оттока ключевых людей.',
      },
    ],
  },
  {
    id: 'ebitda-vs-cashflow',
    sectionId: 'finance',
    title: 'EBITDA или денежный поток: на что смотреть в первую очередь?',
    author: 'Сергей Кулагин',
    date: '2026-06-09T10:30:00',
    body:
      'В разных источниках по-разному расставляют приоритеты. Хочется услышать практиков: на какой показатель вы опираетесь при оценке здоровья бизнеса?',
    comments: [
      {
        id: 'c1',
        author: 'Ольга Дронова',
        date: '2026-06-10T11:00:00',
        text: 'Денежный поток сложнее «приукрасить». EBITDA удобна для сравнения, но кэш — это реальность.',
      },
    ],
  },
  {
    id: 'meetup-spb',
    sectionId: 'community',
    title: 'Встреча слушателей в Санкт-Петербурге',
    author: 'Мария Лаврова',
    date: '2026-06-07T18:00:00',
    body: 'Собираем неформальную встречу выпускников и слушателей в Санкт-Петербурге. Кто готов присоединиться?',
    comments: [],
  },
]

export const getTopicById = (id: string): ForumTopic | undefined =>
  forumTopics.find((t) => t.id === id)

export const getSectionById = (id: string): ForumSection | undefined =>
  forumSections.find((s) => s.id === id)
