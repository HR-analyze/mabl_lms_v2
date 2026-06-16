import { cn } from '@/lib/utils'

interface CrestProps {
  /** показывать ленту с «МАБЛ» */
  withBanner?: boolean
  className?: string
  /** на тёмном фоне — оборачиваем в светлую подложку */
  onDark?: boolean
}

const ALT = 'Герб Международной академии бизнес-лидерства'

/**
 * Герб МАБЛ — растровый ассет из бренд-гайда (public/brand).
 * Эталонная среда логотипа — белый фон, поэтому на тёмных поверхностях
 * герб помещается в светлую подложку (onDark).
 *
 * Размер задаётся через className (h-* w-*): на внешний элемент, а не на img,
 * чтобы избежать конфликта с h-full/w-full.
 */
export function Crest({ withBanner = false, className, onDark = false }: CrestProps) {
  const src = withBanner ? '/brand/crest-banner.png' : '/brand/crest.png'

  if (onDark) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-card bg-wisdom p-1.5',
          className,
        )}
      >
        <img src={src} alt={ALT} className="block h-full w-full object-contain" draggable={false} />
      </span>
    )
  }

  return <img src={src} alt={ALT} className={cn('block shrink-0 object-contain', className)} draggable={false} />
}
