const CACHE_NAME = 'shibasu-keiro-v2'
const STATIC_ASSETS = [
  '/',
  '/favorites',
  '/timetable',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // API・Next.js JSチャンクはネットワーク優先（デプロイ後に即反映させるため）
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/_next/static/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        if (event.request.url.includes('/api/')) {
          return new Response(JSON.stringify({ success: false, error: 'オフラインです' }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return caches.match(event.request).then((cached) => cached ?? Response.error())
      })
    )
    return
  }
  // アプリシェル（HTML）はキャッシュ優先
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ?? fetch(event.request)
    )
  )
})
