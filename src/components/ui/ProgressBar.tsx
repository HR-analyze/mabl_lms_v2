import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number // 0–100
  className?: string
  showLabel?: boolean
}

/** Тонкая линейная шкала прогресса в фирменном Океане. */
export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-ink-60">
          <span>Прогресс</span>
          <span className="text-neft">{clamped}%</span>
        </div>
      )}
      <div className="h-1 w-full overflow-hidden rounded-pill bg-ink-10">
        <div
          className="h-full rounded-pill bg-ocean transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
