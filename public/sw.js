const CACHE = 'arckaton-web-v1';
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon.svg'];

const NAV_SHELL_ROUTES = ['/api/', '/sw.js'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => null)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || NAV_SHELL_ROUTES.some((r) => url.pathname.startsWith(r))) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cached) => fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy)).catch(() => null);
          return res;
        })
        .catch(() => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => null);
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});