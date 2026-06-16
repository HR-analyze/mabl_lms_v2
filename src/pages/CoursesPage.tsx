import { useMemo, useState } from 'react'
import { Container, SectionHeading } from '@/components/ui/Section'
import { CourseCard } from '@/components/CourseCard'
import { useCourses } from '@/context/CoursesContext'
import { usePurchases } from '@/context/PurchaseContext'
import { cn } from '@/lib/utils'

type FilterKey = 'all' | 'owned' | 'available' | 'scorm' | 'video' | 'longread'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'owned', label: 'Купленные' },
  { key: 'available', label: 'Доступные' },
  { key: 'scorm', label: 'SCORM' },
  { key: 'video', label: 'Видео' },
  { key: 'longread', label: 'Лонгриды' },
]

export default function CoursesPage() {
  const { isOwned } = usePurchases()
  const { courses } = useCourses()
  const [active, setActive] = useState<FilterKey>('all')

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      switch (active) {
        case 'owned':
          return isOwned(c.id)
        case 'available':
          return !isOwned(c.id)
        case 'scorm':
        case 'video':
        case 'longread':
          return c.format === active
        default:
          return true
      }
    })
  }, [active, isOwned, courses])

  return (
    <div className="py-14 md:py-20">
      <Container>
        <SectionHeading
          eyebrow="Каталог"
          title="Программы академии"
          description="Флагманские курсы МАБЛ по лидерству, финансам, переговорам и цифровой трансформации. Выберите формат и начните обучение."
        />

        {/* Фильтры */}
        <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-10 pb-6">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={cn(
                'rounded-token px-4 py-2 text-[0.74rem] uppercase tracking-wide transition-colors',
                active === f.key
                  ? 'bg-neft text-wisdom'
                  : 'border border-ink-20 text-ink-60 hover:border-neft hover:text-neft',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                owned={isOwned(course.id) || course.price === 0}
              />
            ))}
          </div>
        ) : (
          <div className="mt-16 rounded-card border border-dashed border-ink-20 py-20 text-center">
            <p className="font-serif text-xl text-neft">В этой категории пока нет курсов</p>
            <p className="mt-2 text-ink-60">Попробуйте выбрать другой фильтр.</p>
          </div>
        )}
      </Container>
    </div>
  )
}
