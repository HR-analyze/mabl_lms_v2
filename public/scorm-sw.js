/*
 * Service Worker для SCORM-пакетов, загруженных через админку.
 *
 * Файлы пакета кладутся страницей в Cache Storage ('scorm-packages') под
 * виртуальными путями /scorm-store/<id>/<путь>. Воркер перехватывает запросы
 * к /scorm-store/ (включая относительные обращения SCORM к своим ресурсам)
 * и отдаёт их из кэша. Это позволяет проигрывать загруженный SCORM прямо в
 * браузере, без серверного хостинга.
 */

const CACHE = 'scorm-packages'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin === self.location.origin && url.pathname.startsWith('/scorm-store/')) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(event.request, { ignoreSearch: true }).then((hit) => {
          if (hit) return hit
          return new Response('SCORM-ресурс не найден', { status: 404 })
        }),
      ),
    )
  }
})
