import { cn } from '@/lib/utils'

interface CrestProps {
  /** показывать ленту с «МАБЛ» */
  withBanner?: boolean
  className?: string
  /** на тёмном фоне — оборачиваем в светлую подложку */
  onDark?: boolean
}

/**
 * Герб МАБЛ — растровый ассет из бренд-гайда (public/brand).
 * Эталонная среда логотипа — белый фон, поэтому на тёмных поверхностях
 * герб помещается в светлую подложку (onDark).
 */
export function Crest({ withBanner = false, className, onDark = false }: CrestProps) {
  const src = withBanner ? '/brand/crest-banner.png' : '/brand/crest.png'
  const img = (
    <img
      src={src}
      alt="Герб Международной академии бизнес-лидерства"
      className={cn('block h-full w-full object-contain', !onDark && className)}
      draggable={false}
    />
  )

  if (onDark) {
    return (
      <span className={cn('inline-flex items-center justify-center rounded-card bg-wisdom p-1.5', className)}>
        {img}
      </span>
    )
  }
  return img
}
