import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Карусель изображений: автолистание, стрелки, точки и свайп на тач-устройствах.
 * Картинки показываются целиком (object-contain) на тёмной подложке — без обрезки.
 */
export function Carousel({
  images,
  className,
  interval = 5000,
}: {
  images: string[]
  className?: string
  interval?: number
}) {
  const [index, setIndex] = useState(0)
  const count = images.length
  const touchStartX = useRef<number | null>(null)

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count])
  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])

  // Автолистание; таймер перезапускается при любой смене кадра.
  useEffect(() => {
    if (count <= 1) return
    const t = setTimeout(() => setIndex((p) => (p + 1) % count), interval)
    return () => clearTimeout(t)
  }, [count, index, interval])

  if (count === 0) return null

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)()
    touchStartX.current = null
  }

  return (
    <div
      className={cn('group relative overflow-hidden rounded-card bg-neft', className)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="flex h-[20rem] min-w-full items-center justify-center sm:h-[26rem] md:h-[32rem]"
          >
            <img
              src={src}
              alt=""
              loading={i === 0 ? undefined : 'lazy'}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={prev}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-neft/55 text-xl text-wisdom backdrop-blur transition-opacity hover:bg-neft/80 md:opacity-0 md:group-hover:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={next}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-neft/55 text-xl text-wisdom backdrop-blur transition-opacity hover:bg-neft/80 md:opacity-0 md:group-hover:opacity-100"
          >
            ›
          </button>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {images.map((_, i) => (
              <button
                type="button"
                key={i}
                aria-label={`Фото ${i + 1}`}
                onClick={() => go(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === index ? 'w-5 bg-wisdom' : 'w-2 bg-wisdom/50 hover:bg-wisdom/80',
                )}
              />
            ))}
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-neft/55 px-2.5 py-1 text-[0.65rem] font-semibold text-wisdom backdrop-blur">
            {index + 1}/{count}
          </div>
        </>
      )}
    </div>
  )
}
