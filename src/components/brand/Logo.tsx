import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Crest } from './Crest'

interface LogoProps {
  /** 'full' — герб + текстовый блок; 'crest' — только герб */
  variant?: 'full' | 'crest'
  className?: string
  onDark?: boolean
  /** оборачивать ли в ссылку на главную */
  to?: string | null
}

/**
 * Логотип МАБЛ. Полная горизонтальная версия собирается из герба и
 * текстового блока в фирменной типографике (TT Rationalist), чтобы текст
 * корректно перекрашивался под тёмный/светлый фон.
 */
export function Logo({ variant = 'full', className, onDark = false, to = '/' }: LogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <Crest className={variant === 'full' ? 'h-11 w-11' : 'h-10 w-10'} onDark={onDark} />
      {variant === 'full' && (
        <span className={cn('flex items-stretch gap-3')}>
          <span className={cn('w-px self-stretch', onDark ? 'bg-wisdom/30' : 'bg-ink-20')} />
          <span
            className={cn(
              'flex flex-col justify-center text-[0.62rem] font-semibold uppercase leading-[1.35] tracking-wide',
              onDark ? 'text-wisdom' : 'text-neft',
            )}
          >
            <span>Международная</span>
            <span>академия</span>
            <span>бизнес-лидерства</span>
          </span>
        </span>
      )}
    </span>
  )

  if (to) {
    return (
      <Link to={to} aria-label="МАБЛ — на главную" className="inline-flex">
        {content}
      </Link>
    )
  }
  return content
}
