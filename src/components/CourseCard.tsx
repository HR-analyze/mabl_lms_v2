import { Link } from 'react-router-dom'
import type { Course } from '@/types'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ProgressBar } from './ui/ProgressBar'
import { Crest } from './brand/Crest'
import { ArrowRight, Lock } from './ui/Icon'
import { courseFormatLabel } from '@/lib/labels'
import { formatPrice } from '@/lib/utils'

interface CourseCardProps {
  course: Course
  owned: boolean
}

/** Карточка курса для каталога и дашборда. */
export function CourseCard({ course, owned }: CourseCardProps) {
  return (
    <article className="group flex flex-col rounded-card border border-ink-10 bg-wisdom transition-colors duration-200 hover:border-ink-40">
      {/* Обложка: фирменная плоскость с гербом и паттерном */}
      <Link
        to={`/courses/${course.id}`}
        className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-t-card bg-neft"
      >
        <div className="brand-pattern absolute inset-0 opacity-[0.08]" />
        <Crest className="relative h-16 w-16" onDark />
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge tone="dark" className="ring-1 ring-wisdom/20">
            {courseFormatLabel[course.format]}
          </Badge>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-2 text-[0.7rem] uppercase tracking-wide text-ink-60">
          <span>{course.level}</span>
          <span className="h-1 w-1 rounded-full bg-ink-20" />
          <span>{course.durationHours} ч</span>
        </div>

        <h3 className="font-serif text-xl leading-tight text-neft">
          <Link to={`/courses/${course.id}`} className="hover:text-ocean">
            {course.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm text-ink-60">{course.subtitle}</p>

        <div className="mt-4 flex-1" />

        {owned ? (
          <div className="space-y-4">
            <ProgressBar value={course.progress} showLabel />
            <Button to={`/courses/${course.id}`} variant="secondary" size="sm" fullWidth>
              {course.progress > 0 ? 'Продолжить' : 'Начать обучение'}
              <ArrowRight width={16} height={16} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t border-ink-10 pt-4">
            <span className="font-serif text-lg text-neft">{formatPrice(course.price)}</span>
            <Button to={`/checkout?course=${course.id}`} size="sm">
              <Lock width={15} height={15} />
              Купить
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
