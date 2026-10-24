// Minimal Service Worker for Mingle Booth PWA Installability
const CACHE_NAME = 'mingle-booth-v1';
const PRECACHE_URLS = [
  '/',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first strategy: always fetch fresh from server, fallback to cache if offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip server actions / api / admin mutations
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
