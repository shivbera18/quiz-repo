// Service Worker for Quiz App PWA
const STATIC_CACHE = 'quiz-app-static-v2';
const DYNAMIC_CACHE = 'quiz-app-dynamic-v2';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve public same-origin resources from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isStaticAsset = requestUrl.pathname.startsWith('/_next/static/') ||
    requestUrl.pathname.startsWith('/icons/') ||
    requestUrl.pathname === '/manifest.webmanifest';

  if (event.request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    !isStaticAsset ||
    event.request.headers.has('authorization')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            const cacheControl = response.headers.get('cache-control') || '';
            const isCacheable = response.status === 200 &&
              response.type === 'basic' &&
              !/(?:no-store|private)/i.test(cacheControl);

            if (!isCacheable) return response;

            return caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(event.request, response.clone()))
              .catch(() => undefined)
              .then(() => response);
          });
      })
  );
});

// Background sync (for future offline functionality)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Handle background sync tasks here
  }
});

// Push notifications (enhanced implementation)
self.addEventListener('push', (event) => {
  console.log('Push received:', event);

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
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: notificationData.url || data.url || '/dashboard'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/icon-192x192.svg'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: priority === 'urgent' || priority === 'high',
    silent: false,
    tag: data.tag || 'announcement' // Group similar notifications
  };

  // Set title based on priority
  let title = 'Quiz App';
  if (priority === 'urgent') {
    title = '🚨 URGENT: ' + (data.title || 'Quiz App');
  } else if (priority === 'high') {
    title = '⚠️ ' + (data.title || 'Quiz App');
  } else if (data.title) {
    title = data.title;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

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

// Handle notification close (for analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  // Could send analytics data here
});
