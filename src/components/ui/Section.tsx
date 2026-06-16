import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Контейнер ширины контента с фирменными отступами «много воздуха». */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-content px-6 md:px-10', className)}>{children}</div>
}

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  className?: string
  align?: 'left' | 'center'
}

/** Заголовок раздела: надзаголовок-разрядка + крупный титул. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', className)}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 className="font-serif text-3xl font-light uppercase tracking-wide text-neft md:text-[2.1rem]">
        {title}
      </h2>
      {description && <p className="mt-4 max-w-2xl text-ink-60">{description}</p>}
    </div>
  )
}
