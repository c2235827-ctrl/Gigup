const CACHE_NAME = 'gigup-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/manifest.json'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install Phase: Preset system assets in offline store
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching Core App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Phase: Clear stale storage versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Erasing obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all pages
  );
});

// Fetch Interception: Network-First falling back to Offline Shell
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/S requests, skip chrome extensions or internal protocols
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If valid response, clone and cache it for future offline usage
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        console.log('[SW] Device offline. Fetching from cache:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return generic offline page if index.html or document is requested
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Push Event Listener: listens to native mobile pushes and triggers self.registration.showNotification
self.addEventListener('push', (event) => {
  let payload = { title: 'GigUp Nigeria', message: 'New update received!' };
  
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'GigUp Nigeria', message: event.data.text() };
    }
  }

  const title = payload.title || payload.subject || 'GigUp Nigeria';
  const options = {
    body: payload.message || payload.body || 'Update received!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Click action feedback: opens/focuses browser viewport 
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

