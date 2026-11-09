// Azota Toán - Service Worker (PWA Offline Cache & Install)
const CACHE_NAME = 'azota-toan-v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/favicon.svg',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/db.js',
  './js/deviceSecurity.js',
  './js/grading.js',
  './js/excelHelper.js',
  './js/mathRenderer.js',
  './js/sampleData.js',
  './js/views/navbar.js',
  './js/views/studentLogin.js',
  './js/views/studentDashboard.js',
  './js/views/examTaking.js',
  './js/views/examResult.js',
  './js/views/adminLogin.js',
  './js/views/adminSetup.js',
  './js/views/adminDashboard.js',
  './js/views/studentManagement.js',
  './js/views/examEditor.js',
  './js/views/examAssign.js',
  './js/views/analytics.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('[SW] Cache add warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first with fallback to cache for app resources
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
