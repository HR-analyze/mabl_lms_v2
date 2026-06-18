import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Container } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Check, Clock } from '@/components/ui/Icon'
import { api } from '@/api'
import { usePurchases } from '@/context/PurchaseContext'

type State = 'checking' | 'done' | 'pending'

/**
 * Возврат с формы оплаты (реальный PSP). Опрашиваем доступ к программе:
 * как только оплата подтверждена вебхуком и доступ открыт — показываем успех.
 */
export default function PaymentReturnPage() {
  const [params] = useSearchParams()
  const courseId = params.get('course') || ''
  const { refreshAccess } = usePurchases()
  const [state, setState] = useState<State>('checking')
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    let tries = 0
    let active = true

    const poll = async () => {
      const access = await api.enrollments
        .access()
        .catch(() => ({ courses: [] as string[], events: [] as string[] }))
      if (!active) return
      tries += 1
      if (access.courses.includes(courseId)) {
        await refreshAccess()
        setState('done')
        return
      }
      if (tries >= 6) {
        setState('pending')
        return
      }
      timer.current = setTimeout(poll, 2000)
    }

    poll()
    return () => {
      active = false
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  return (
    <Container className="py-20 md:py-28">
      <div className="mx-auto max-w-lg rounded-card border border-ink-10 bg-wisdom p-10 text-center">
        {state === 'done' ? (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-oceanc-10 text-ocean">
              <Check width={32} height={32} />
            </span>
            <h1 className="mt-6 font-serif text-3xl text-neft">Оплата подтверждена</h1>
            <p className="mt-3 text-ink-60">Доступ к программе открыт. Можно приступать к обучению.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {courseId && <Button to={`/courses/${courseId}`}>Перейти к курсу</Button>}
              <Button to="/dashboard" variant="secondary">В личный кабинет</Button>
            </div>
          </>
        ) : state === 'pending' ? (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink-5 text-ink-60">
              <Clock width={30} height={30} />
            </span>
            <h1 className="mt-6 font-serif text-3xl text-neft">Оплата обрабатывается</h1>
            <p className="mt-3 text-ink-60">
              Подтверждение от банка может занять до нескольких минут. Доступ откроется автоматически —
              обновите страницу личного кабинета чуть позже.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button to="/dashboard">В личный кабинет</Button>
              {courseId && (
                <Button to={`/courses/${courseId}`} variant="secondary">К программе</Button>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-ink-5 text-ink-60">
              <Clock width={30} height={30} />
            </span>
            <h1 className="mt-6 font-serif text-3xl text-neft">Проверяем оплату…</h1>
            <p className="mt-3 text-ink-60">Подождите несколько секунд.</p>
          </>
        )}
        <p className="mt-8 text-[0.72rem] uppercase tracking-wide text-ink-40">
          <Link to="/courses" className="hover:text-neft">К каталогу</Link>
        </p>
      </div>
    </Container>
  )
}
