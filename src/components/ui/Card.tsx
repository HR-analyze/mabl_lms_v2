import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** интерактивная карточка (hover-подъём тонкой линией) */
  interactive?: boolean
}

/** Базовая карточка: белый фон, тонкая линия, строгая геометрия. */
export function Card({ children, interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-ink-10 bg-wisdom',
        interactive && 'transition-colors duration-200 hover:border-ink-40',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>
}
