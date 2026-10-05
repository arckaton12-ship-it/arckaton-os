const CACHE = 'arckaton-web-v1';
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon.svg'];

const NAV_SHELL_ROUTES = ['/api/', '/sw.js'];

// Les assets sont nommes par leur contenu, donc un nouveau build n'invalide
// rien : sans plafond, le cache accumule les fichiers de chaque deploiement
// jusqu'a saturer le quota du navigateur. On borne donc, en evictant les
// insertions les plus anciennes (le Cache API conserve l'ordre d'insertion).
const MAX_CACHED_ENTRIES = 80;

async function trimCache() {
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  const excess = keys.length - MAX_CACHED_ENTRIES;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
}

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
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, copy))
              .then(trimCache)
              .catch(() => null);
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});