// Toán Thầy Tùng - Service Worker (PWA Offline Cache & Install)
const CACHE_NAME = 'toan-thay-tung-v2.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo-thay-tung.jpg',
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
  // 1. Chỉ can thiệp các request GET cùng origin, bỏ qua hoàn toàn CDN bên ngoài
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // 2. Với trang HTML (Navigation), luôn lấy trực tiếp từ Network để cập nhật mới nhất
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const indexCached = await caches.match('./index.html');
          if (indexCached) return indexCached;
          return new Response('Offline: Vui lòng kết nối mạng để tải bài thi.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 3. Với tài nguyên tĩnh cục bộ (CSS, JS, hình ảnh): Network first, fallback sang Cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Trả về response rỗng an toàn, không bao giờ để undefined gây sập trang trắng
        return new Response('', { status: 408 });
      })
  );
});
