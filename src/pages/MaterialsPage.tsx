import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/ui/Section'
import { Badge } from '@/components/ui/Badge'
import { Document } from '@/components/ui/Icon'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useCourses } from '@/context/CoursesContext'
import { formatDate, cn } from '@/lib/utils'
import type { MaterialType } from '@/types'

const types: (MaterialType | 'Все')[] = ['Все', 'PDF', 'Шаблон', 'Презентация', 'Чек-лист', 'Видео']

export default function MaterialsPage() {
  const { getCourseById } = useCourses()
  const { data } = useAsync(() => api.materials.list(), [])
  const materials = useMemo(() => data ?? [], [data])
  const [active, setActive] = useState<MaterialType | 'Все'>('Все')

  const filtered = useMemo(
    () => (active === 'Все' ? materials : materials.filter((m) => m.type === active)),
    [active, materials],
  )

  return (
    <div className="py-14 md:py-20">
      <Container>
        <SectionHeading
          eyebrow="Библиотека"
          title="Учебные материалы"
          description="Шаблоны, презентации, чек-листы и руководства к программам академии."
        />

        <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-10 pb-6">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={cn(
                'rounded-token px-4 py-2 text-[0.74rem] uppercase tracking-wide transition-colors',
                active === t ? 'bg-neft text-wisdom' : 'border border-ink-20 text-ink-60 hover:border-neft hover:text-neft',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-card border border-ink-10 bg-ink-10 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const course = m.courseId ? getCourseById(m.courseId) : undefined
            return (
              <Link key={m.id} to={`/materials/${m.id}`} className="group flex flex-col bg-wisdom p-6 transition-colors hover:bg-ink-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-card border border-ink-10 text-ocean">
                    <Document width={20} height={20} />
                  </span>
                  <Badge tone="neutral">{m.type}</Badge>
                </div>
                <h3 className="mt-5 font-serif text-lg leading-snug text-neft group-hover:text-ocean">{m.title}</h3>
                <p className="mt-2 flex-1 text-sm text-ink-60">{m.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-ink-10 pt-3 text-[0.7rem] uppercase tracking-wide text-ink-40">
                  <span>{formatDate(m.date)}</span>
                  <span>{m.size}</span>
                </div>
                {course && <p className="mt-2 text-[0.72rem] text-ink-60">К курсу «{course.title}»</p>}
              </Link>
            )
          })}
        </div>
      </Container>
    </div>
  )
}
