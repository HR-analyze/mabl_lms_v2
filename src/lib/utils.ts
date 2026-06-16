/** Утилиты форматирования и склейки классов */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const months = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${d.getDate()} ${months[d.getMonth()]}, ${time}`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatPrice(value: number): string {
  if (value === 0) return 'Бесплатно'
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽'
}

/** Имитация задержки сети для mock-сценариев */
export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
