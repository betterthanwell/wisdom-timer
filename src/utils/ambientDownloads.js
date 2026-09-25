import { AUDIO_SOURCES, AMBIENT_CACHE } from '../constants/audioSources';
import { debugLog } from './debugLog';

// Ambient sounds are big (7-25 MB each), so none is downloaded up front: a
// sound is downloaded when it's chosen, then kept in Cache Storage for good,
// where the service worker plays it from - online or offline.
//
// Each sound's status: 'checking' (looking in the cache, at page load),
// 'missing', 'downloading' (with `progress`, 0-1), 'kept' or 'failed'. Only a
// kept sound plays. Without Cache Storage (old browsers, jsdom) every sound
// counts as kept and streams from the network as before.
export const createAmbientDownloads = ({
  sources = AUDIO_SOURCES.ambient,
  cacheStorage = globalThis.caches,
  fetchSound = (path) => fetch(path),
} = {}) => {
  const ids = Object.keys(sources);
  const listeners = new Set();
  let statuses = Object.fromEntries(ids.map((id) => [id, { state: cacheStorage ? 'checking' : 'kept' }]));
  const set = (id, status) => {
    statuses = { ...statuses, [id]: status };
    listeners.forEach((listener) => listener());
  };

  const openCache = () => cacheStorage.open(AMBIENT_CACHE);
  const checked = cacheStorage
    ? openCache()
        .then((cache) => Promise.all(ids.map(async (id) => set(id, { state: (await cache.match(sources[id].path)) ? 'kept' : 'missing' }))))
        .catch(() => ids.forEach((id) => set(id, { state: 'missing' })))
    : Promise.resolve();

  const running = new Map(); // id -> download promise

  const save = async (id) => {
    const { path } = sources[id];
    set(id, { state: 'downloading', progress: 0 });
    try {
      const response = await fetchSound(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const total = Number(response.headers.get('Content-Length')) || 0;
      const type = response.headers.get('Content-Type') || 'audio/mpeg';
      let body;
      if (response.body && total) {
        const chunks = [];
        let received = 0;
        const reader = response.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          const progress = Math.min(received / total, 1);
          // Only re-render for each whole percent
          if (Math.floor(progress * 100) > Math.floor(statuses[id].progress * 100)) set(id, { state: 'downloading', progress });
        }
        body = new Blob(chunks, { type });
      } else {
        body = await response.blob();
      }
      const cache = await openCache();
      await cache.put(path, new Response(body, { headers: { 'Content-Type': type, 'Content-Length': String(body.size) } }));
      set(id, { state: 'kept' });
      debugLog.add(`ambient ${id} downloaded`);
      return true;
    } catch (error) {
      set(id, { state: 'failed' });
      debugLog.add(`ambient ${id} download FAILED: ${error.message}`);
      console.warn(`Could not download the ambient sound "${id}":`, error);
      return false;
    }
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    statuses: () => statuses,
    isKept: (id) => statuses[id]?.state === 'kept',
    // Download a sound unless it's kept or already downloading; resolves to
    // whether it's kept
    async download(id) {
      if (!sources[id]) return false;
      await checked;
      if (statuses[id].state === 'kept') return true;
      if (!running.has(id)) running.set(id, save(id).finally(() => running.delete(id)));
      return running.get(id);
    },
  };
};

export const ambientDownloads = createAmbientDownloads();
