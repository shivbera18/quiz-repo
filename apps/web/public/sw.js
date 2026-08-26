// Service Worker for Quiz App PWA
const STATIC_CACHE = 'quiz-app-static-v3';
const DYNAMIC_CACHE = 'quiz-app-dynamic-v3';
const DYNAMIC_CACHE_LIMIT = 120;

// Core shell cached at install. Each entry is fetched independently so a
// single missing asset can NEVER fail the whole install -- a failed install
// means the browser never activates the worker and the app is not
// installable at all.
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      ).then((results) => {
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn('[sw] some precache entries failed:', failed.map((f) => String(f.reason)));
        }
      })
    )
    // Updates are user-gated: the page shows a "New version available"
    // banner and posts { type: 'SKIP_WAITING' } only when the user opts in.
    // Auto-taking control here would swap caches under a running session.
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
          .map((cacheName) => {
            console.log('[sw] deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// Cap the runtime cache so it cannot grow without bound across a long-lived
// installation. Oldest-written entries go first (keys() is insertion order).
async function pruneDynamicCache() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const keys = await cache.keys();
  if (keys.length <= DYNAMIC_CACHE_LIMIT) return;
  for (const key of keys.slice(0, keys.length - DYNAMIC_CACHE_LIMIT)) {
    await cache.delete(key);
  }
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/offline.html'
  );
}

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;
  if (event.request.headers.has('authorization')) return;

  // Navigations: network-first so users get fresh pages when online, falling
  // back to (in order) the last-cached copy of THAT page and finally the
  // pre-cached offline shell. Without this branch an offline visit showed
  // the browser's dinosaur instead of offline.html.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          if (cachedPage) return cachedPage;
          const offlineShell = await caches.match('/offline.html');
          return offlineShell || Response.error();
        })
    );
    return;
  }

  if (!isStaticAsset(requestUrl.pathname)) return;

  // Static assets: cache-first (they are content-hashed or immutable).
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        const cacheControl = response.headers.get('cache-control') || '';
        const isCacheable =
          response.status === 200 &&
          response.type === 'basic' &&
          !/(?:no-store|private)/i.test(cacheControl);
        if (!isCacheable) return response;
        return caches
          .open(DYNAMIC_CACHE)
          .then((cache) => cache.put(event.request, response.clone()))
          .catch(() => undefined)
          .then(() => {
            pruneDynamicCache().catch(() => {});
            return response;
          });
      });
    })
  );
});

// Display browser push payloads from notification-svc.
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    const rawData = event.data.text();
    try {
      const parsed = JSON.parse(rawData);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
    } catch {
      data = { body: rawData };
    }
  }
  const notificationData = data.data && typeof data.data === 'object' && !Array.isArray(data.data)
    ? data.data
    : {};
  const priority = notificationData.priority || data.priority;

  const options = {
    body: data.body || 'New announcement available!',
    // Android notifications render bitmap icons only -- SVGs are silently
    // dropped, so point these at the PNGs.
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: notificationData.url || data.url || '/dashboard' },
    requireInteraction: priority === 'urgent' || priority === 'high',
    tag: data.tag || 'announcement'
  };

  const title = data.title || 'Quiz App';

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl;
  try {
    targetUrl = new URL(event.notification.data?.url || '/dashboard', self.location.origin);
    if (targetUrl.origin !== self.location.origin || !['http:', 'https:'].includes(targetUrl.protocol)) {
      targetUrl = new URL('/dashboard', self.location.origin);
    }
  } catch {
    targetUrl = new URL('/dashboard', self.location.origin);
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === targetUrl.href && 'focus' in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl.href);
        }
      })
  );
});
