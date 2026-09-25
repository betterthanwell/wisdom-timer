/* global VERSION, PRECACHE, AMBIENT_CACHE, AMBIENT_PATHS */
// Service worker: keeps the app and its bells on the device, so the timer
// opens and works without a network (airplane mode, no signal). Not bundled
// with the app: the serviceWorker() plugin in vite.config.js emits it as
// /sw.js in production builds, with VERSION, PRECACHE, AMBIENT_CACHE and
// AMBIENT_PATHS defined above it.
//
// - Install: download everything in PRECACHE into a cache named after
//   VERSION. VERSION changes whenever any of those files does, so each
//   deploy that changes something brings a new worker and a fresh cache.
// - Activate: delete the caches of older versions.
// - Fetch: files in PRECACHE (and page loads) come from the cache. Ambient
//   sounds come from AMBIENT_CACHE once the app has downloaded them there
//   (utils/ambientDownloads.js; kept across versions), else the network.
//   <audio> elements load with Range requests; for kept files those get the
//   requested part of the cached file (206), since Safari won't play a full
//   response to one - this is what lets ambient sounds, and bells that fall
//   back to <audio>, play offline.

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
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Every page load gets the app's page
  const path = request.mode === 'navigate' ? '/' : url.pathname;
  const cacheName = PRECACHE.includes(path) ? CACHE : AMBIENT_PATHS.includes(path) ? AMBIENT_CACHE : null;
  if (!cacheName) return;

  const range = request.headers.get('range');
  event.respondWith(
    caches
      .open(cacheName)
      .then((cache) => cache.match(path))
      .then((cached) => {
        if (!cached) return fetch(request);
        return range ? partOf(cached, range) : cached;
      })
  );
});

// The part of a cached response that a Range header asks for, e.g.
// "bytes=0-" or "bytes=0-1" (Safari's first request) - as a 206 response
const partOf = async (response, range) => {
  const body = await response.blob();
  const size = body.size;
  const [, first, last] = /^bytes=(\d*)-(\d*)$/.exec(range.trim()) ?? [];
  let start, end;
  if (first) {
    start = Number(first);
    end = last ? Math.min(Number(last), size - 1) : size - 1;
  } else if (last) {
    // "bytes=-500": the last 500 bytes
    start = Math.max(0, size - Number(last));
    end = size - 1;
  }
  if (start === undefined || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  const part = body.slice(start, end + 1);
  return new Response(part, {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? body.type,
      'Content-Length': String(part.size),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  });
};
