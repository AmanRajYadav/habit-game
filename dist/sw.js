/* Emergency cache clearing service worker */
const CACHE_VERSION = 'habit-game-v5-emergency-clear';

self.addEventListener('install', (event) => {
  event.waitUntil(
    // Clear ALL caches on install
    caches.keys().then((keys) => 
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Clear ALL caches again on activate
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // BYPASS ALL CACHING - fetch everything fresh from network
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .catch(() => new Response('Network error', { status: 503 }))
  );
});


