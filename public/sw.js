const CACHE_NAME = 'growth-portal-cache-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
  'https://cdn.tailwindcss.com',
  'https://img.icons8.com/?size=192&id=T4XFjOf8yBTh&format=png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event with Stale-While-Revalidate fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests, ignore Firebase transactions, Chrome extensions, etc.
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip auth, DB, hot-reload, live APIs
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('supabase') ||
    (url.hostname.includes('localhost') && url.port === '3000' && url.pathname.includes('/api'))
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache successful responses from same origin or standard CDNs
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.origin === self.location.origin || url.hostname.includes('fonts') || url.hostname.includes('esm.sh') || url.hostname.includes('tailwindcss.com'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.log('[Service Worker] Fetch failed, ignoring but serving cached version if exists', err);
        return null;
      });

      // Return cached file immediately, falling back to network fetch
      return cachedResponse || fetchPromise;
    })
  );
});

// Native Push Reminder Events (Kept intact)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Habit Reminder', body: 'Time to check your goals!' };
  
  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      url: self.location.origin
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
