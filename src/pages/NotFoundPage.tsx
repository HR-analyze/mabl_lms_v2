import { Container } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Crest } from '@/components/brand/Crest'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center bg-wisdom">
      <Container className="py-24 text-center">
        <Crest className="mx-auto h-20 w-20" />
        <p className="eyebrow mt-8">Ошибка 404</p>
        <h1 className="mt-3 font-serif text-5xl font-light text-neft">Страница не найдена</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-60">
          Возможно, страница была перемещена или больше не существует.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button to="/">На главную</Button>
          <Button to="/courses" variant="secondary">К каталогу</Button>
        </div>
      </Container>
    </div>
  )
}
