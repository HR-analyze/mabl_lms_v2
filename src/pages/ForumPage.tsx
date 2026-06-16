import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/ui/Section'
import { Badge } from '@/components/ui/Badge'
import { ArrowUpRight, Chat } from '@/components/ui/Icon'
import { forumSections, forumTopics } from '@/data/forum'
import { formatDate } from '@/lib/utils'

export default function ForumPage() {
  return (
    <div className="py-14 md:py-20">
      <Container>
        <SectionHeading
          eyebrow="Сообщество"
          title="Форум МАБЛ"
          description="Профессиональные дискуссии слушателей и преподавателей академии. Делитесь опытом и обсуждайте кейсы."
        />

        {/* Разделы */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {forumSections.map((section) => {
            const topics = forumTopics.filter((t) => t.sectionId === section.id)
            return (
              <div key={section.id} className="rounded-card border border-ink-10 p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-card bg-neft text-wisdom">
                  <Chat width={20} height={20} />
                </span>
                <h3 className="mt-5 font-serif text-xl text-neft">{section.title}</h3>
                <p className="mt-2 text-sm text-ink-60">{section.description}</p>
                <p className="mt-4 text-[0.72rem] uppercase tracking-wide text-ink-40">
                  {section.topicsCount} тем · {topics.length} активных
                </p>
              </div>
            )
          })}
        </div>

        {/* Темы */}
        <div className="mt-14">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-serif text-2xl text-neft">Обсуждения</h2>
          </div>
          <div className="overflow-hidden rounded-card border border-ink-10">
            {forumTopics.map((topic) => {
              const section = forumSections.find((s) => s.id === topic.sectionId)
              return (
                <Link
                  key={topic.id}
                  to={`/forum/${topic.id}`}
                  className="group flex items-center gap-5 border-b border-ink-10 px-6 py-5 transition-colors last:border-b-0 hover:bg-ink-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone="outline">{section?.title}</Badge>
                    </div>
                    <h3 className="mt-2 font-serif text-lg leading-snug text-neft group-hover:text-ocean">
                      {topic.title}
                    </h3>
                    <p className="mt-1 text-[0.78rem] text-ink-60">
                      {topic.author} · {formatDate(topic.date)} · {topic.comments.length} ответов
                    </p>
                  </div>
                  <ArrowUpRight width={18} height={18} className="shrink-0 text-ink-40 group-hover:text-ocean" />
                </Link>
              )
            })}
          </div>
        </div>
      </Container>
    </div>
  )
}
