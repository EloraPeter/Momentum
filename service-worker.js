const CACHE_NAME = 'momentum-cache-v1';
const urlsToCache = [
  '/main/index.html',
  '/main/style.css',
  '/main/script.js',
  '/images/logo2.png',
  '/images/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
