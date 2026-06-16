import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/ui/Section'
import { Badge } from '@/components/ui/Badge'
import { ArrowRight, Clipboard } from '@/components/ui/Icon'
import { surveys } from '@/data/surveys'
import { getCourseById } from '@/data/courses'

export default function SurveysPage() {
  return (
    <div className="py-14 md:py-20">
      <Container>
        <SectionHeading
          eyebrow="Обратная связь"
          title="Опросники"
          description="Помогите академии стать лучше: оцените курсы и вебинары. Каждый опрос занимает несколько минут."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {surveys.map((survey) => {
            const course = survey.relatedCourseId ? getCourseById(survey.relatedCourseId) : undefined
            return (
              <Link
                key={survey.id}
                to={`/surveys/${survey.id}`}
                className="group flex flex-col rounded-card border border-ink-10 p-7 transition-colors hover:border-ink-40"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-card bg-neft text-wisdom">
                    <Clipboard width={20} height={20} />
                  </span>
                  <Badge tone="outline">{survey.questions.length} вопросов</Badge>
                </div>
                <h3 className="mt-5 font-serif text-xl text-neft group-hover:text-ocean">{survey.title}</h3>
                <p className="mt-2 flex-1 text-sm text-ink-60">{survey.description}</p>
                {course && <p className="mt-4 text-[0.72rem] text-ink-60">Курс: {course.title}</p>}
                <span className="mt-5 inline-flex items-center gap-2 text-[0.74rem] uppercase tracking-wide text-ocean">
                  Пройти опрос <ArrowRight width={16} height={16} />
                </span>
              </Link>
            )
          })}
        </div>
      </Container>
    </div>
  )
}
