import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/ui/Section'
import { Badge } from '@/components/ui/Badge'
import { Crest } from '@/components/brand/Crest'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { formatDate, cn } from '@/lib/utils'
import type { NewsCategory } from '@/types'

const categories: (NewsCategory | 'Все')[] = ['Все', 'Академия', 'Вебинары', 'Курсы', 'События']

export default function NewsPage() {
  const { data } = useAsync(() => api.news.list(), [])
  const news = useMemo(() => data ?? [], [data])
  const [active, setActive] = useState<NewsCategory | 'Все'>('Все')

  const filtered = useMemo(
    () => (active === 'Все' ? news : news.filter((n) => n.category === active)),
    [active, news],
  )
  const [lead, ...rest] = filtered

  return (
    <div className="py-14 md:py-20">
      <Container>
        <SectionHeading eyebrow="Хроника академии" title="Новости МАБЛ" />

        <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-10 pb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={cn(
                'rounded-token px-4 py-2 text-[0.74rem] uppercase tracking-wide transition-colors',
                active === c ? 'bg-neft text-wisdom' : 'border border-ink-20 text-ink-60 hover:border-neft hover:text-neft',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {lead && (
          <Link
            to={`/news/${lead.id}`}
            className="group mt-10 grid overflow-hidden rounded-card border border-ink-10 md:grid-cols-2"
          >
            <div className="relative flex min-h-[220px] items-center justify-center bg-neft">
              <div className="brand-pattern absolute inset-0 opacity-[0.08]" />
              <Crest className="relative h-20 w-20" onDark />
            </div>
            <div className="p-8 md:p-10">
              <Badge tone="ocean">{lead.category}</Badge>
              <p className="mt-4 text-[0.72rem] uppercase tracking-wide text-ink-40">
                {formatDate(lead.date)} · {lead.readingTime}
              </p>
              <h2 className="mt-2 font-serif text-2xl leading-tight text-neft group-hover:text-ocean md:text-3xl">
                {lead.title}
              </h2>
              <p className="mt-4 text-ink-60">{lead.excerpt}</p>
            </div>
          </Link>
        )}

        <div className="mt-8 grid gap-px overflow-hidden rounded-card border border-ink-10 bg-ink-10 md:grid-cols-3">
          {rest.map((item) => (
            <Link key={item.id} to={`/news/${item.id}`} className="group bg-wisdom p-7 transition-colors hover:bg-ink-5">
              <Badge tone="outline">{item.category}</Badge>
              <p className="mt-4 text-[0.7rem] uppercase tracking-wide text-ink-40">{formatDate(item.date)}</p>
              <h3 className="mt-2 font-serif text-xl leading-snug text-neft group-hover:text-ocean">{item.title}</h3>
              <p className="mt-3 text-sm text-ink-60">{item.excerpt}</p>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  )
}
