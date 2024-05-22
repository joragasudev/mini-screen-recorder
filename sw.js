const CACHE_NAME = 'cache-v1';
const urlsToCache = [
  '/',
  '/css/styles.css',
  '/css/pico.min.css',
  '/js/script.js',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/assets/github-mark.svg',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(e => console.log(e))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});