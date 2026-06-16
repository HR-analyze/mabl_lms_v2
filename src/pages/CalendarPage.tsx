import { useMemo, useState } from 'react'
import { Container, SectionHeading } from '@/components/ui/Section'
import { EventCard } from '@/components/EventCard'
import { Badge } from '@/components/ui/Badge'
import { Check } from '@/components/ui/Icon'
import { events } from '@/data/events'
import { usePurchases } from '@/context/PurchaseContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import type { CalendarEvent, CalendarEventType } from '@/types'

const tabs: (CalendarEventType | 'Все')[] = ['Все', 'Вебинар', 'Дедлайн', 'Мероприятие']
const tabLabel: Record<CalendarEventType | 'Все', string> = {
  Все: 'Все',
  Вебинар: 'Вебинары',
  Дедлайн: 'Дедлайны',
  Мероприятие: 'Мероприятия',
}

export default function CalendarPage() {
  const { isRegistered, registerEvent } = usePurchases()
  const { user } = useAuth()
  const [active, setActive] = useState<CalendarEventType | 'Все'>('Все')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState('')

  const sorted = useMemo(
    () => [...events].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [],
  )
  const filtered = active === 'Все' ? sorted : sorted.filter((e) => e.type === active)

  const handleRegister = async (event: CalendarEvent) => {
    setBusyId(event.id)
    setConfirmation('')
    try {
      await registerEvent(
        event.id,
        event.price && event.price > 0
          ? {
              itemId: event.id,
              itemTitle: event.title,
              amount: event.price,
              currency: 'RUB',
              customerEmail: user?.email,
            }
          : undefined,
      )
      setConfirmation(`Вы записаны на «${event.title}». Детали отправлены на вашу почту.`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="py-14 md:py-20">
      <Container>
        <SectionHeading
          eyebrow="Расписание"
          title="Календарь академии"
          description="Вебинары, дедлайны курсов и мероприятия сообщества МАБЛ. Записывайтесь на события в один клик."
        />

        {confirmation && (
          <div className="mt-8 flex items-center gap-3 rounded-card border border-oceanc-20 bg-oceanc-10 px-5 py-4 text-sm text-ocean">
            <Check width={18} height={18} />
            {confirmation}
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-10 pb-6">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={cn(
                'rounded-token px-4 py-2 text-[0.74rem] uppercase tracking-wide transition-colors',
                active === t ? 'bg-neft text-wisdom' : 'border border-ink-20 text-ink-60 hover:border-neft hover:text-neft',
              )}
            >
              {tabLabel[t]}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          {filtered.map((event) => (
            <div key={event.id} className="relative">
              <EventCard
                event={event}
                registered={isRegistered(event.id)}
                onRegister={handleRegister}
              />
              {busyId === event.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-card bg-wisdom/70">
                  <Badge tone="ocean">Оформляем запись…</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </div>
  )
}
