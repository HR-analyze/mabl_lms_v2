import crypto from 'node:crypto'

/**
 * Криптография авторизации без внешних зависимостей (node:crypto):
 * - пароли: scrypt с солью, формат "salt:hash" (hex);
 * - токены: JWT HS256.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me'
const TOKEN_TTL = 60 * 60 * 24 * 7 // 7 дней

export interface TokenPayload {
  sub: string
  kind: 'admin' | 'student'
  email: string
  iat?: number
  exp?: number
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored || !stored.includes(':')) return false
  const [saltHex, hashHex] = stored.split(':')
  const hash = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(hashHex, 'hex')
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected)
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000)
  const body: TokenPayload = { ...payload, iat: now, exp: now + TOKEN_TTL }
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const data = `${head}.${b64url(JSON.stringify(body))}`
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(data).digest())
  return `${data}.${sig}`
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [head, payload, sig] = parts
  const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${head}.${payload}`).digest())
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenPayload
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null
    return body
  } catch {
    return null
  }
}
