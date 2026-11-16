/**
 * Mise service worker — offline app shell only.
 *
 * - Precaches the shell (/, logo, icons, manifest) so the app opens offline.
 * - Navigations are network-first with the cached shell as the offline
 *   fallback; the app itself reads/writes localStorage, so the fridge,
 *   shopping list, meal plan and favourites all work offline.
 * - Static assets are stale-while-revalidate.
 * - API calls (`/api/*`) are NEVER cached — an AI result must never be
 *   served stale. AI features need a connection; everything else works.
 *
 * Bump CACHE_NAME when the shell changes so old caches are dropped.
 */

const CACHE_NAME = 'mise-shell-v1';
const SHELL = [
  '/',
  '/mise-logo.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API calls always go to the network — never serve a stale AI result.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached || network;
    }),
  );
});
