import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Crest } from '@/components/brand/Crest'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { login, recover, demoAccounts } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/dashboard'

  const [mode, setMode] = useState<'login' | 'recover'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const submitLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const account = await login(email, password)
      // Администратора по умолчанию ведём в админ-панель.
      const target = from === '/dashboard' && account.kind === 'admin' ? '/admin' : from
      navigate(target, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const submitRecover = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const message = await recover(email)
      setInfo(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка восстановления')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError('')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Брендовая панель */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-neft p-12 text-wisdom lg:flex">
        <div className="brand-pattern absolute inset-0 opacity-[0.07]" />
        <div className="relative">
          <Logo onDark />
        </div>
        <div className="relative">
          <Crest withBanner className="mb-10 h-32 w-32" onDark />
          <h2 className="display-title text-4xl">Знать и вести</h2>
          <p className="mt-5 max-w-sm text-wisdom/60">
            Личный кабинет слушателя МАБЛ: курсы, прогресс обучения, вебинары и сообщество
            академии в едином пространстве.
          </p>
        </div>
        <p className="relative text-[0.72rem] uppercase tracking-wide text-wisdom/40">
          Sapere · Ducere
        </p>
      </div>

      {/* Форма */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          <p className="eyebrow mb-3">{mode === 'login' ? 'Вход для слушателей' : 'Восстановление'}</p>
          <h1 className="font-serif text-3xl text-neft">
            {mode === 'login' ? 'Личный кабинет' : 'Восстановить доступ'}
          </h1>

          {mode === 'login' ? (
            <form onSubmit={submitLogin} className="mt-9 space-y-5">
              <Input
                label="E-mail"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Пароль"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="rounded-token border border-ocean/40 bg-oceanc-10 px-4 py-3 text-sm text-ocean">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? 'Входим…' : 'Войти'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setMode('recover'); setError(''); setInfo('') }}
                  className="text-ink-60 hover:text-neft"
                >
                  Забыли пароль?
                </button>
                <Link to="/" className="text-ink-60 hover:text-neft">
                  На главную
                </Link>
              </div>

              {/* Демо-доступ: слушатель и администратор */}
              <div className="rounded-token border border-dashed border-ink-20 p-4 text-sm text-ink-60">
                <p className="font-medium text-neft">Демо-доступ</p>
                <p className="mt-1 text-ink-60">Войдите под одной из ролей одним кликом:</p>
                <div className="mt-3 space-y-3">
                  {demoAccounts.map((acc) => (
                    <div
                      key={acc.email}
                      className="flex items-center justify-between gap-3 rounded-token bg-ink-5 px-3 py-2"
                    >
                      <div className="leading-tight">
                        <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-neft">
                          {acc.label}
                        </p>
                        <p className="text-[0.78rem] text-ink-60">
                          {acc.email} · {acc.password}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fillDemo(acc.email, acc.password)}
                        className="shrink-0 text-ocean hover:text-oceanc-80"
                      >
                        Подставить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={submitRecover} className="mt-9 space-y-5">
              <p className="text-sm text-ink-60">
                Укажите e-mail, привязанный к аккаунту. Мы отправим инструкцию по восстановлению.
              </p>
              <Input
                label="E-mail"
                type="email"
                name="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && (
                <div className="rounded-token border border-ocean/40 bg-oceanc-10 px-4 py-3 text-sm text-ocean">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-token border border-ink-20 bg-ink-5 px-4 py-3 text-sm text-neft">
                  {info}
                </div>
              )}

              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? 'Отправляем…' : 'Отправить инструкцию'}
              </Button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setInfo('') }}
                className="block text-sm text-ink-60 hover:text-neft"
              >
                ← Вернуться ко входу
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
