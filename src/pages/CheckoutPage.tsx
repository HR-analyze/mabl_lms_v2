import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Container } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Crest } from '@/components/brand/Crest'
import { Check, Lock } from '@/components/ui/Icon'
import { useCourses } from '@/context/CoursesContext'
import { usePurchases } from '@/context/PurchaseContext'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/utils'
import { courseFormatLabel } from '@/lib/labels'

export default function CheckoutPage() {
  const [params] = useSearchParams()
  const courseId = params.get('course') || ''
  const { getCourseById } = useCourses()
  const course = getCourseById(courseId)
  const { purchaseCourse, isOwned, paymentProvider } = usePurchases()
  const { user } = useAuth()

  const [email, setEmail] = useState(user?.email || '')
  const [name, setName] = useState(user?.name || '')
  const [card, setCard] = useState('')
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [txId, setTxId] = useState('')
  const [error, setError] = useState('')

  const alreadyOwned = useMemo(() => (course ? isOwned(course.id) : false), [course, isOwned])

  if (!course) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-serif text-3xl text-neft">Курс не найден</h1>
        <p className="mt-4 text-ink-60">Выберите программу в каталоге.</p>
        <Button to="/courses" className="mt-8">К каталогу</Button>
      </Container>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setProcessing(true)
    try {
      const result = await purchaseCourse({
        itemId: course.id,
        itemTitle: course.title,
        amount: course.price,
        currency: 'RUB',
        customerEmail: email,
      })
      if (result.status === 'succeeded') {
        setTxId(result.transactionId)
        setDone(true)
      } else {
        setError(result.message)
      }
    } catch {
      setError('Не удалось провести оплату. Попробуйте ещё раз.')
    } finally {
      setProcessing(false)
    }
  }

  // Экран успеха
  if (done || alreadyOwned) {
    return (
      <Container className="py-20 md:py-28">
        <div className="mx-auto max-w-lg rounded-card border border-ink-10 bg-wisdom p-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-oceanc-10 text-ocean">
            <Check width={32} height={32} />
          </span>
          <h1 className="mt-6 font-serif text-3xl text-neft">Доступ открыт</h1>
          <p className="mt-3 text-ink-60">
            Курс «{course.title}» добавлен в ваш личный кабинет. Можно приступать к обучению.
          </p>
          {txId && (
            <p className="mt-4 text-[0.72rem] uppercase tracking-wide text-ink-40">
              Транзакция: {txId}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button to={`/courses/${course.id}`}>Перейти к курсу</Button>
            <Button to="/dashboard" variant="secondary">
              В личный кабинет
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-12 md:py-16">
      <Link to="/courses" className="text-sm text-ink-60 hover:text-neft">← Назад к каталогу</Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_0.85fr]">
        {/* Платёжная форма */}
        <div>
          <p className="eyebrow mb-3">Оформление доступа</p>
          <h1 className="font-serif text-3xl text-neft">Оплата курса</h1>
          <p className="mt-3 max-w-md text-ink-60">
            Демо-режим оплаты. Реальные платежи подключаются через провайдера
            ({paymentProvider.name} → ЮKassa / Stripe) без изменения интерфейса.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <Input label="Имя и фамилия" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Александр Орлов" />
            <Input label="E-mail для доступа" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
            <Input
              label="Номер карты"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              placeholder="0000 0000 0000 0000"
              hint="Демо-поле: данные не передаются и не сохраняются."
              inputMode="numeric"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Срок" placeholder="ММ / ГГ" />
              <Input label="CVC" placeholder="•••" />
            </div>

            {error && (
              <div className="rounded-token border border-ocean/40 bg-oceanc-10 px-4 py-3 text-sm text-ocean">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" fullWidth disabled={processing}>
              <Lock width={16} height={16} />
              {processing ? 'Проводим оплату…' : `Оплатить ${formatPrice(course.price)}`}
            </Button>
            <p className="text-center text-[0.72rem] text-ink-40">
              Нажимая «Оплатить», вы принимаете <Link to="/offer" className="underline hover:text-ink-80">публичную оферту</Link>, <Link to="/privacy" className="underline hover:text-ink-80">политику конфиденциальности</Link> и даёте <Link to="/consent-personal-data" className="underline hover:text-ink-80">согласие на обработку персональных данных</Link> МАБЛ.
            </p>
          </form>
        </div>

        {/* Сводка заказа */}
        <aside className="lg:pt-16">
          <div className="overflow-hidden rounded-card border border-ink-10">
            <div className="relative flex items-center gap-4 bg-neft p-6 text-wisdom">
              <div className="brand-pattern absolute inset-0 opacity-[0.08]" />
              <Crest className="relative h-14 w-14" onDark />
              <div className="relative">
                <p className="text-[0.7rem] uppercase tracking-wide text-wisdom/50">Программа</p>
                <p className="font-serif text-lg leading-tight">{course.title}</p>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Badge tone="ocean">{courseFormatLabel[course.format]}</Badge>
                <Badge tone="outline">{course.level}</Badge>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-60">Преподаватель</dt><dd className="text-neft">{course.instructor}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-60">Объём</dt><dd className="text-neft">{course.durationHours} ч · {course.lessonsCount} уроков</dd></div>
              </dl>
              <div className="flex items-center justify-between border-t border-ink-10 pt-4">
                <span className="text-sm uppercase tracking-wide text-ink-60">Итого</span>
                <span className="font-serif text-2xl text-neft">{formatPrice(course.price)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  )
}
