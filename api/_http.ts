import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Типы запроса/ответа API.
 *
 * Обработчики получают обычные объекты Express (`status`, `json`, `send`,
 * `redirect`, `req.query`, `req.body`), но описываем минимальный контракт сами
 * и ни от чего не зависим: так обработчики остаются проверяемыми в отрыве от
 * конкретного HTTP-фреймворка.
 */

export interface ApiRequest extends IncomingMessage {
  /** Разобранная строка запроса (`?path=...`). */
  query: Record<string, string | string[] | undefined>
  /** Тело запроса: JSON-объект, строка или Buffer (для загрузки файлов). */
  body?: unknown
}

export interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
  send(body: unknown): ApiResponse
  redirect(status: number, url: string): void
}
