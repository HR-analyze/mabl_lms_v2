import { authApi } from './auth'
import { coursesApi } from './courses'
import { usersApi } from './users'
import { ordersApi } from './orders'
import { eventsApi } from './events'

/**
 * Единая точка доступа к данным приложения.
 *
 * Все компоненты и контексты работают только через `api.*`, не зная, откуда
 * приходят данные (mock или реальный бэкенд). Это позволяет «выходить из демо»
 * постепенно, ресурс за ресурсом.
 */
export const api = {
  auth: authApi,
  courses: coursesApi,
  users: usersApi,
  orders: ordersApi,
  events: eventsApi,
}

export { USE_MOCK, API_URL, ApiError } from './config'
export type { DemoAccount } from './auth'
