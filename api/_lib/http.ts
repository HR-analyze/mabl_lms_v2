import type { VercelRequest } from '@vercel/node'
import { verifyToken } from './auth'
import type { TokenPayload } from './auth'

/** Ошибка с HTTP-статусом для единообразных ответов. */
export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Текущий пользователь из заголовка Authorization (или null). */
export function getAuth(req: VercelRequest): TokenPayload | null {
  const header = req.headers['authorization']
  if (!header || Array.isArray(header)) return null
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return verifyToken(token)
}

/** Требует авторизованного пользователя. */
export function requireAuth(req: VercelRequest): TokenPayload {
  const user = getAuth(req)
  if (!user) throw new HttpError(401, 'Требуется авторизация.')
  return user
}

/** Требует роль администратора. */
export function requireAdmin(req: VercelRequest): TokenPayload {
  const user = requireAuth(req)
  if (user.kind !== 'admin') throw new HttpError(403, 'Доступ только для администратора.')
  return user
}

/** Распарсить JSON-тело запроса (Vercel уже парсит req.body для JSON). */
export function readBody<T = unknown>(req: VercelRequest): T {
  if (req.body == null) return {} as T
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T
    } catch {
      throw new HttpError(400, 'Некорректное тело запроса (ожидался JSON).')
    }
  }
  return req.body as T
}
