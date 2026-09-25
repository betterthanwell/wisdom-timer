// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createAmbientDownloads } from './ambientDownloads';
import { AMBIENT_CACHE } from '../constants/audioSources';

const SOURCES = {
  rain: { path: '/audio/ambient/rain.mp3' },
  ocean: { path: '/audio/ambient/ocean.mp3' },
};

// Cache Storage in memory
const fakeCacheStorage = (kept = {}) => {
  const entries = new Map(Object.entries(kept));
  const cache = {
    match: async (path) => entries.get(path),
    put: async (path, response) => void entries.set(path, response),
  };
  return { entries, open: vi.fn(async () => cache) };
};

// A download response of `size` bytes, arriving in 4 chunks
const soundResponse = (size = 400) => {
  const chunk = new Uint8Array(size / 4);
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < 4; i++) controller.enqueue(chunk);
        controller.close();
      },
    }),
    { headers: { 'Content-Length': String(size), 'Content-Type': 'audio/mp4' } }
  );
};

const statesOf = (downloads) => Object.fromEntries(Object.entries(downloads.statuses()).map(([id, s]) => [id, s.state]));

describe('ambientDownloads', () => {
  it('finds the sounds kept on the device at page load', async () => {
    const cacheStorage = fakeCacheStorage({ '/audio/ambient/rain.mp3': new Response('x') });
    const downloads = createAmbientDownloads({ sources: SOURCES, cacheStorage, fetchSound: vi.fn() });
    expect(statesOf(downloads)).toEqual({ rain: 'checking', ocean: 'checking' });

    await vi.waitFor(() => expect(statesOf(downloads)).toEqual({ rain: 'kept', ocean: 'missing' }));
    expect(cacheStorage.open).toHaveBeenCalledWith(AMBIENT_CACHE);
  });

  it('downloads a sound once, reports progress, and keeps it', async () => {
    const cacheStorage = fakeCacheStorage();
    const fetchSound = vi.fn(async () => soundResponse());
    const downloads = createAmbientDownloads({ sources: SOURCES, cacheStorage, fetchSound });
    const progress = [];
    downloads.subscribe(() => {
      const { state, progress: p } = downloads.statuses().rain;
      if (state === 'downloading') progress.push(p);
    });

    const [first, second] = await Promise.all([downloads.download('rain'), downloads.download('rain')]);

    expect([first, second]).toEqual([true, true]);
    expect(fetchSound).toHaveBeenCalledTimes(1);
    expect(progress).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(downloads.isKept('rain')).toBe(true);
    const kept = cacheStorage.entries.get('/audio/ambient/rain.mp3');
    expect((await kept.arrayBuffer()).byteLength).toBe(400);
    expect(kept.headers.get('Content-Type')).toBe('audio/mp4');

    // Kept: no second download
    expect(await downloads.download('rain')).toBe(true);
    expect(fetchSound).toHaveBeenCalledTimes(1);
  });

  it('marks a failed download (offline) and tries again when asked', async () => {
    const fetchSound = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(soundResponse());
    const downloads = createAmbientDownloads({ sources: SOURCES, cacheStorage: fakeCacheStorage(), fetchSound });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await downloads.download('ocean')).toBe(false);
    expect(downloads.statuses().ocean.state).toBe('failed');

    expect(await downloads.download('ocean')).toBe(true);
    expect(downloads.isKept('ocean')).toBe(true);
  });

  it('treats an HTTP error as a failed download, keeping nothing', async () => {
    const cacheStorage = fakeCacheStorage();
    const fetchSound = vi.fn(async () => new Response('Not found', { status: 404 }));
    const downloads = createAmbientDownloads({ sources: SOURCES, cacheStorage, fetchSound });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await downloads.download('rain')).toBe(false);
    expect(cacheStorage.entries.size).toBe(0);
  });

  it('without Cache Storage, every sound counts as kept and streams as before', async () => {
    const fetchSound = vi.fn();
    const downloads = createAmbientDownloads({ sources: SOURCES, cacheStorage: undefined, fetchSound });

    expect(statesOf(downloads)).toEqual({ rain: 'kept', ocean: 'kept' });
    expect(await downloads.download('rain')).toBe(true);
    expect(fetchSound).not.toHaveBeenCalled();
  });
});
