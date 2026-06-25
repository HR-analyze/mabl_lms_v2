import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Crest } from '@/components/brand/Crest'
import { ArrowUpRight, Clock } from '@/components/ui/Icon'
import { programs } from '@/data/programs'

/** Каталог флагманских программ (Executive MBA и трансформационные программы). */
export default function ProgramsPage() {
  return (
    <div className="pb-20">
      {/* Шапка раздела */}
      <section className="relative overflow-hidden bg-neft text-wisdom">
        <div className="brand-pattern absolute inset-0 opacity-[0.08]" />
        <Container className="relative py-16 md:py-24">
          <p className="eyebrow mb-4 text-wisdom/50">Программы МАБЛ</p>
          <h1 className="max-w-3xl font-serif text-3xl font-light uppercase leading-tight tracking-wide md:text-5xl">
            Программы для лидеров,<br />управляющих стоимостью бизнеса
          </h1>
          <p className="mt-6 max-w-2xl text-wisdom/70">
            Длительные программы уровня Executive: стратегия, цифровая трансформация,
            данные и искусственный интеллект — с защитой проекта уровня совета директоров.
          </p>
        </Container>
      </section>

      <Container className="mt-14 md:mt-20">
        <SectionHeading
          eyebrow="Каталог"
          title="Выберите программу"
          description="Каждая программа — это практический трек с лабораториями, международным модулем и реальным проектом вашей компании."
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {programs.map((p) => (
            <Card key={p.id} interactive className="flex flex-col overflow-hidden">
              {/* Тёмная обложка */}
              <div className="relative flex items-center gap-4 bg-neft p-6 text-wisdom">
                <div className="brand-pattern absolute inset-0 opacity-[0.08]" />
                <Crest className="relative h-12 w-12" onDark />
                <div className="relative">
                  <p className="text-[0.7rem] uppercase tracking-wide text-wisdom/50">{p.category}</p>
                  <p className="font-serif text-xl leading-tight">{p.title}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                {p.subtitle && <p className="font-serif text-lg text-neft">{p.subtitle}</p>}
                <p className="mt-3 flex-1 text-sm text-ink-60">{p.tagline}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge tone="ocean">
                    <Clock width={13} height={13} /> {p.durationLabel}
                  </Badge>
                  {p.facts
                    .filter((f) => f.label !== 'Продолжительность')
                    .slice(0, 3)
                    .map((f) => (
                      <Badge key={f.label} tone="outline">
                        {f.value}
                      </Badge>
                    ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-ink-10 pt-5">
                  <span className="text-xs uppercase tracking-wide text-ink-40">
                    {p.modules.length} блоков · {p.outcomes.length} результатов
                  </span>
                  <Link
                    to={`/programs/${p.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-ocean hover:text-oceanc-80"
                  >
                    Подробнее <ArrowUpRight width={15} height={15} />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-14 rounded-card border border-ink-10 bg-ink-5 p-8 text-center md:p-12">
          <h2 className="font-serif text-2xl text-neft">Не определились с программой?</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-60">
            Расскажите о задачах вашей компании — мы поможем выбрать формат и подскажем
            ближайший набор.
          </p>
          <Button to="/courses" className="mt-6">
            Смотреть все курсы
          </Button>
        </div>
      </Container>
    </div>
  )
}
