const CACHE_NAME = 'nursing-hub-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/subject.html',
  '/subject.js',
  '/lecture.html',
  '/faq.html',
  '/terms.html',
  '/mcq.html',
  '/portfolio.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});