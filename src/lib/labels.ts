import type { CourseFormat, NotificationKind } from '@/types'

export const courseFormatLabel: Record<CourseFormat, string> = {
  scorm: 'SCORM',
  video: 'Видео',
  longread: 'Лонгрид',
}

export const notificationKindLabel: Record<NotificationKind, string> = {
  course: 'Курс',
  event: 'Событие',
  forum: 'Форум',
  system: 'Система',
  survey: 'Опрос',
}
