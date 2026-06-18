/**
 * Конфигурация слоя данных.
 *
 * Приложение общается с данными ТОЛЬКО через модули `src/api/*`. Сейчас активен
 * mock-режим (данные из локальных файлов и localStorage), но каждый ресурс уже
 * имеет http-реализацию. Переключение — через переменные окружения, без правок
 * в компонентах:
 *
 *   VITE_API_MODE=http
 *   VITE_API_URL=https://api.mabl.ru
 *
 * Это первый шаг «выхода из демо»: когда появится реальный бэкенд, достаточно
 * задать переменные окружения — UI менять не придётся.
 */

const MODE = import.meta.env.VITE_API_MODE ?? 'mock'

/** true — данные берутся из локальных mock-источников; false — из реального API. */
export const USE_MOCK = MODE !== 'http'

/** Базовый URL реального API. */
export const API_URL = import.meta.env.VITE_API_URL ?? '/api'

/** Имитация сетевой задержки, чтобы UI был готов к асинхронности заранее. */
export const mockDelay = (ms = 200): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** Ошибка обращения к API с HTTP-статусом (если есть). */
export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Базовый HTTP-клиент для реального бэкенда (используется http-реализациями). */
export async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { getToken } = await import('@/lib/token')
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!res.ok) {
    let message = `Ошибка запроса (${res.status})`
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      /* тело без JSON — оставляем сообщение по умолчанию */
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
