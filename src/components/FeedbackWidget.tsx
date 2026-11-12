import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { api, ApiError } from '@/api'
import type { FeedbackTarget } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { cn, formatDateTime } from '@/lib/utils'

const RATING_LABELS = ['', 'Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично']
const COMMENT_MAX = 2000

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={30}
      height={30}
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
    >
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  )
}

/**
 * Окно обратной связи: оценка 1–5 звёзд и необязательный отзыв.
 *
 * Отзыв один на слушателя и объект: если он уже оставлен, форма открывается
 * с ним, и отправка его правит. Гостю предлагаем войти; у курса без доступа
 * сервер отвечает canRate=false, и формы нет — оценивать то, чего не видел,
 * незачем.
 */
export function FeedbackWidget({
  targetType,
  targetId,
  title = 'Оцените программу',
  className,
}: {
  targetType: FeedbackTarget
  targetId: string
  title?: string
  className?: string
}) {
  const { user, isAuthenticated } = useAuth()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [canRate, setCanRate] = useState<boolean | null>(null)
  const [reason, setReason] = useState<string>()
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setCanRate(null)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    api.feedback
      .mine(targetType, targetId)
      .then((res) => {
        if (!active) return
        setCanRate(res.canRate)
        setReason(res.reason)
        setRating(res.mine?.rating ?? 0)
        setComment(res.mine?.comment ?? '')
        setSavedAt(res.mine?.updatedAt ?? null)
      })
      .catch((err) => {
        if (!active) return
        // 401 — сессия протухла: показываем приглашение войти, а не ошибку.
        if (err instanceof ApiError && err.status === 401) setCanRate(null)
        else setError('Не удалось загрузить форму отзыва.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [targetType, targetId, isAuthenticated, user?.id])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) {
      setError('Поставьте оценку от 1 до 5.')
      return
    }
    setBusy(true)
    setError(null)
    setJustSaved(false)
    try {
      const saved = await api.feedback.save(targetType, targetId, { rating, comment: comment.trim() })
      setSavedAt(saved.updatedAt)
      setJustSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить отзыв.')
    } finally {
      setBusy(false)
    }
  }

  const shown = hover || rating

  return (
    <section
      className={cn('rounded-card border border-ink-10 bg-wisdom p-6 md:p-8', className)}
      aria-labelledby={`feedback-${targetType}-${targetId}`}
    >
      <p className="eyebrow mb-2">Обратная связь</p>
      <h2 id={`feedback-${targetType}-${targetId}`} className="font-serif text-2xl text-neft">
        {title}
      </h2>

      {!isAuthenticated ? (
        <p className="mt-4 text-sm text-ink-60">
          Чтобы оставить оценку и отзыв,{' '}
          <Link to="/login" className="font-semibold text-ocean hover:underline">
            войдите в аккаунт
          </Link>
          .
        </p>
      ) : loading || canRate === null ? (
        <p className="mt-4 text-sm text-ink-60">{error ?? 'Загрузка…'}</p>
      ) : !canRate ? (
        <p className="mt-4 text-sm text-ink-60">
          {reason ?? 'Оценить можно после того, как программа станет вам доступна.'}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5">
          <fieldset>
            <legend className="mb-2 text-[0.72rem] uppercase tracking-wide text-ink-60">
              Ваша оценка
            </legend>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex" role="radiogroup" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <label
                    key={value}
                    onMouseEnter={() => setHover(value)}
                    className={cn(
                      'cursor-pointer p-0.5 transition-colors',
                      value <= shown ? 'text-ocean' : 'text-ink-20 hover:text-oceanc-60',
                    )}
                  >
                    <input
                      type="radio"
                      name={`rating-${targetType}-${targetId}`}
                      value={value}
                      checked={rating === value}
                      onChange={() => {
                        setRating(value)
                        setJustSaved(false)
                      }}
                      className="peer sr-only"
                      aria-label={`${value} из 5 — ${RATING_LABELS[value]}`}
                    />
                    <span className="block rounded-token peer-focus-visible:ring-2 peer-focus-visible:ring-ocean">
                      <StarIcon filled={value <= shown} />
                    </span>
                  </label>
                ))}
              </div>
              <span className="text-sm text-ink-60" aria-live="polite">
                {shown ? `${shown} из 5 · ${RATING_LABELS[shown]}` : 'Не выбрано'}
              </span>
            </div>
          </fieldset>

          <div className="mt-5">
            <Textarea
              name={`feedback-comment-${targetType}-${targetId}`}
              label="Отзыв (необязательно)"
              rows={4}
              maxLength={COMMENT_MAX}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                setJustSaved(false)
              }}
              placeholder="Что понравилось, что стоит улучшить?"
            />
          </div>

          {error && <p className="mt-3 text-sm text-ocean">{error}</p>}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.75rem] text-ink-40" aria-live="polite">
              {justSaved
                ? 'Спасибо! Отзыв сохранён.'
                : savedAt
                  ? `Ваш отзыв от ${formatDateTime(savedAt)} — можно изменить.`
                  : 'Отзыв видит только команда академии.'}
            </p>
            <Button type="submit" size="sm" disabled={busy || !rating}>
              {busy ? 'Отправка…' : savedAt ? 'Обновить отзыв' : 'Отправить'}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
