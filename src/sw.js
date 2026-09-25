/* global VERSION, PRECACHE */
// Service worker: keeps the app and its bells on the device, so the timer
// opens and works without a network (airplane mode, no signal). Not bundled
// with the app: the serviceWorker() plugin in vite.config.js emits it as
// /sw.js in production builds, with VERSION and PRECACHE defined above it.
//
// - Install: download everything in PRECACHE into a cache named after
//   VERSION. VERSION changes whenever any of those files does, so each
//   deploy that changes something brings a new worker and a fresh cache.
// - Activate: delete the caches of older versions.
// - Fetch: files in PRECACHE (and page loads) come from the cache, anything
//   else from the network. Range requests (media streaming, e.g. ambient
//   sounds) are left to the network: a full cached response doesn't answer
//   them, and Safari won't play it.

const CACHE_PREFIX = 'wisdom-timer-';
const CACHE = `${CACHE_PREFIX}${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // Take over from an older version right away; otherwise a single open
      // tab would keep using the old version, even across reloads
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)))
      )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Every page load gets the app's page
  const path = request.mode === 'navigate' ? '/' : url.pathname;
  if (!PRECACHE.includes(path)) return;

  event.respondWith(
    caches.open(CACHE).then((cache) => cache.match(path)).then((cached) => cached ?? fetch(request))
  );
});
