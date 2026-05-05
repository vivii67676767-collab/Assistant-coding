// AI Coding Assistant — Service Worker
// Cache name — ganti versi kalau update file
const CACHE_NAME = 'ai-coding-assistant-v1';

// File yang di-cache untuk offline
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Syne:wght@400;700;800&display=swap'
];

// Install — cache semua asset
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell...');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Beberapa asset gagal di-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — hapus cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Hapus cache lama:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch — cache-first untuk asset lokal, network-first untuk API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass service worker untuk Groq API & Google Fonts (butuh network)
  if (
    url.hostname === 'api.groq.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    return event.respondWith(fetch(event.request));
  }

  // Cache-first untuk asset lokal
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Simpan ke cache kalau response valid
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback ke index.html kalau offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
