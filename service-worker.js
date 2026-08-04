const CACHE_NAME = 'pixel-rider-cache-v14';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './market.js',
  './crew.js',
  './icon-512x512.png',
  './mobile-optimierung.css',
  './mobile-optimierung.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => {
    return Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) return caches.delete(key);
    }));
  }));
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
