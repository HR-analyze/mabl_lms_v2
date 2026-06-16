import type { Survey } from '@/types'

export const surveys: Survey[] = [
  {
    id: 'course-feedback',
    title: 'Обратная связь по курсу',
    description: 'Помогите нам сделать обучение лучше. Опрос займёт 2–3 минуты.',
    relatedCourseId: 'strategic-leadership',
    questions: [
      {
        id: 'q1',
        type: 'single',
        title: 'Насколько курс соответствовал вашим ожиданиям?',
        options: ['Превзошёл ожидания', 'Соответствовал', 'Частично', 'Не соответствовал'],
        required: true,
      },
      {
        id: 'q2',
        type: 'multiple',
        title: 'Какие форматы оказались для вас наиболее полезными?',
        options: ['Видео-лекции', 'Лонгриды', 'SCORM-симуляторы', 'Практические задания'],
      },
      {
        id: 'q3',
        type: 'scale',
        title: 'Оцените работу преподавателя по шкале от 1 до 5',
        required: true,
      },
      {
        id: 'q4',
        type: 'text',
        title: 'Что бы вы добавили или изменили в программе?',
      },
    ],
  },
  {
    id: 'webinar-nps',
    title: 'Оценка вебинара',
    description: 'Короткий опрос по итогам вебинара.',
    questions: [
      {
        id: 'q1',
        type: 'scale',
        title: 'Насколько вероятно, что вы порекомендуете вебинар коллегам?',
        required: true,
      },
      {
        id: 'q2',
        type: 'single',
        title: 'Темп вебинара был для вас комфортным?',
        options: ['Слишком медленно', 'Комфортно', 'Слишком быстро'],
        required: true,
      },
      {
        id: 'q3',
        type: 'text',
        title: 'Какую тему вы хотели бы разобрать в следующий раз?',
      },
    ],
  },
]

export const getSurveyById = (id: string): Survey | undefined =>
  surveys.find((s) => s.id === id)
