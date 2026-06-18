import type { VercelRequest, VercelResponse } from '@vercel/node'
import { route } from './_lib/routes'
import { HttpError } from './_lib/http'

/**
 * Единая serverless-функция-роутер (одна функция вместо десятков — под лимит
 * Vercel Hobby). Принимает все запросы /api/* и диспетчеризует их по ресурсам.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname.replace(/^\/api\/?/, '')
    const segs = path.split('/').filter(Boolean)
    await route(req.method ?? 'GET', segs, req, res)
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ message: err.message })
      return
    }
    console.error('[api] unhandled error', err)
    res.status(500).json({ message: 'Внутренняя ошибка сервера.' })
  }
}
