const CACHE_NAME = 'ai-screenplay-v4';
const ASSETS = [
  '/',
  '/home.html',
  '/dashboard.html',
  '/auth.html',
  '/index.html',
  '/admin.html',
  '/css/style.css',
  '/css/dashboard.css',
  '/css/auth.css',
  '/css/home.css',
  '/css/admin.css',
  '/css/pwa.css',
  '/js/config.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/app.js',
  '/js/projectManager.js',
  '/js/pwa.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell assets');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[Service Worker] Caching assets failure (some optional files might be missing):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  const requestUrl = new URL(e.request.url);

  // Bỏ qua các yêu cầu không phải GET hoặc yêu cầu tới các API/oauth/proxy
  if (
    e.request.method !== 'GET' || 
    requestUrl.pathname.startsWith('/api/') || 
    requestUrl.pathname.startsWith('/python-api/') ||
    e.request.url.includes('google.com') ||
    e.request.url.includes('accounts.google.com')
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Trả về từ cache và cập nhật cache ngầm (Stale-While-Revalidate)
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {/* Bỏ qua lỗi mạng ngầm */});
        return cachedResponse;
      }
      
      // Nếu chưa có trong cache, tải từ mạng
      return fetch(e.request).then((networkResponse) => {
        // Chỉ lưu vào cache các phản hồi thành công cùng nguồn hoặc CDN tĩnh
        const isSuccessful = networkResponse && networkResponse.status === 200;
        const isCachableOrigin = e.request.url.startsWith(self.location.origin) || 
                                 e.request.url.includes('cdnjs.cloudflare.com') || 
                                 e.request.url.includes('fonts.googleapis.com') || 
                                 e.request.url.includes('fonts.gstatic.com');
                                 
        if (isSuccessful && isCachableOrigin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Khi mất mạng và tải trang HTML
        if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
          return caches.match('/dashboard.html') || caches.match('/home.html') || caches.match('/');
        }
      });
    })
  );
});
