// sw.js
const CACHE_NAME = 'nursing-hub-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/guard.js',
  '/login-student.html',
  '/student-dashboard.html',
  '/about.html',
  '/faq.html',
  '/terms.html',
  '/mcq.html',
  '/portfolio.html',
  '/manifest.json'
];

// تثبيت الـ SW وتخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// تنشيط الـ SW ومسح الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// استراتيجية الجلب
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // متخزنش طلبات Firebase أو Google APIs
  if (url.origin.includes('firebase') || url.origin.includes('googleapis') || url.origin.includes('gstatic')) {
    return;
  }

  // ملفات HTML: Network First (عشان دايماً يكون أحدث نسخة)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // ملفات CSS/JS/الصور: Cache First (لأنها مش بتتغير كتير)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});