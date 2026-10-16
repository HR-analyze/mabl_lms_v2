/**
 * Чтение переменных окружения — только через эти функции.
 *
 * Почему не `process.env.ИМЯ` напрямую. PaaS-хостинг (RelaxDEV) сканирует код
 * на обращения вида `process.env.ИМЯ` и для имён, которых нет в его
 * настройках, подставляет заглушку — и при сборке, и в работающем
 * приложении. Заглушка — непустая строка, поэтому `||` и `??` её не
 * отбрасывают, а `Boolean(...)` считает переменную заданной: незаданный
 * S3_BUCKET переключил бы хранилище на несуществующий бакет, SMTP_HOST —
 * почту на несуществующий сервер, DATABASE_POOL_MAX превратился бы в NaN.
 * Обращение по ключу (`process.env[name]`) сканер не трогает.
 *
 * Пустая строка и строка из пробелов считаются незаданным значением: на
 * платформах переменную часто «очищают», оставляя пустое значение.
 */
export function env(name: string): string | undefined {
  const value = process.env[name]
  return value === undefined || value.trim() === '' ? undefined : value
}

/**
 * Числовая переменная. Нечисловое или неположительное значение — не повод
 * падать или молча работать с NaN: берётся значение по умолчанию.
 */
export function envNumber(name: string, fallback: number): number {
  const raw = env(name)
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (Number.isFinite(value) && value > 0) return value
  console.warn(`[env] ${name}=${JSON.stringify(raw)} — не число, беру ${fallback}`)
  return fallback
}
