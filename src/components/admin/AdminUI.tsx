import type { ReactNode } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

/** Единый заголовок страницы админ-панели. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-10 pb-6">
      <div>
        <p className="eyebrow mb-3">Администрирование</p>
        <h1 className="font-serif text-3xl text-neft">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** KPI-карточка с числом и подписью. */
export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
}) {
  return (
    <Card>
      <CardBody className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[0.72rem] uppercase tracking-wide text-ink-60">{label}</p>
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-neft text-wisdom">
              {icon}
            </span>
          )}
        </div>
        <p className="mt-3 font-serif text-3xl font-light text-neft">{value}</p>
        {hint && <p className="mt-1 text-[0.75rem] text-ink-60">{hint}</p>}
      </CardBody>
    </Card>
  )
}

type PillTone = 'positive' | 'neutral' | 'muted'

const pillTones: Record<PillTone, string> = {
  positive: 'bg-oceanc-10 text-ocean',
  neutral: 'bg-ink-5 text-ink-80',
  muted: 'border border-ink-20 text-ink-40',
}

/** Статус-метка (заказ, участник). */
export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-token px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide',
        pillTones[tone],
      )}
    >
      {children}
    </span>
  )
}
