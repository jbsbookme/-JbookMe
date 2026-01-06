// Service Worker for BookMe PWA
const CACHE_NAME = 'bookme-v5';
const urlsToCache = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-96.png',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('bookme-') && cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event
// - For HTML navigations: network-only (ultra fresh, no HTML caching).
// - For other GET requests: cache-first, then network (but never cache HTML).
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const accept = request.headers.get('accept') || '';
  const isHTML = request.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            '<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Offline</title></head><body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;text-align:center"><div><h1 style="margin:0 0 8px;font-size:20px">You\'re offline</h1><p style="margin:0;color:#9ca3af;font-size:14px">Please check your connection and try again.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request.clone()).then((response) => {
        if (!response || response.status !== 200) return response;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) return response;

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return response;
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'BookMe',
        body: event.data.text(),
      };
    }
  }
  
  const title = data.title || 'BookMe';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/',
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/icon-96.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-96.png',
      },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Open the app or focus existing window
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((windowClients) => {
      // Check if there's already a window open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Sync event - for background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // Sync messages when back online
      fetch('/api/messages/sync', {
        method: 'POST',
      })
    );
  }
});
