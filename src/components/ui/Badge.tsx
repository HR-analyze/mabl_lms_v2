import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'ocean' | 'dark' | 'outline'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-5 text-ink-60',
  ocean: 'bg-oceanc-10 text-ocean',
  dark: 'bg-neft text-wisdom',
  outline: 'border border-ink-20 text-ink-60',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-token px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
