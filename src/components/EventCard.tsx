import type { CalendarEvent } from '@/types'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Check, Clock, Pin } from './ui/Icon'
import { formatDateTime, formatPrice } from '@/lib/utils'

interface EventCardProps {
  event: CalendarEvent
  registered: boolean
  onRegister?: (event: CalendarEvent) => void
}

const toneByType = {
  Вебинар: 'ocean',
  Дедлайн: 'outline',
  Мероприятие: 'dark',
} as const

/** Карточка события календаря: вебинар, дедлайн, мероприятие. */
export function EventCard({ event, registered, onRegister }: EventCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-card border border-ink-10 bg-wisdom p-6 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-5">
        {/* Дата-блок */}
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-card border border-ink-10 bg-ink-5">
          <span className="font-serif text-2xl leading-none text-neft">
            {new Date(event.date).getDate()}
          </span>
          <span className="mt-1 text-[0.62rem] uppercase tracking-wide text-ink-60">
            {new Date(event.date).toLocaleString('ru-RU', { month: 'short' })}
          </span>
        </div>

        <div>
          <Badge tone={toneByType[event.type]}>{event.type}</Badge>
          <h3 className="mt-2 font-serif text-lg leading-tight text-neft">{event.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-ink-60">
            <span className="inline-flex items-center gap-1.5">
              <Clock width={14} height={14} />
              {formatDateTime(event.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Pin width={14} height={14} />
              {event.location}
            </span>
          </div>
        </div>
      </div>

      {event.registrable && (
        <div className="flex items-center gap-4 md:flex-col md:items-end">
          <span className="font-serif text-base text-neft">
            {typeof event.price === 'number' ? formatPrice(event.price) : ''}
          </span>
          {registered ? (
            <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold uppercase tracking-wide text-ocean">
              <Check width={16} height={16} />
              Вы записаны
            </span>
          ) : (
            <Button size="sm" onClick={() => onRegister?.(event)}>
              Записаться
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
