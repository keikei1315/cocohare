self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() => new Response('', { status: 503 }))
  )
})

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'ぽとり', {
      body: data.body ?? '',
      icon: '/potori/happy.png',
      badge: '/potori/happy.png',
      data: { url: data.url ?? '/counseling' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url)
    || (self.location.origin + '/counseling/chat')
  event.waitUntil(clients.openWindow(targetUrl))
})
