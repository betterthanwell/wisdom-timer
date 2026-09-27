import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWakeLock, isWakeLockSupported } from './useWakeLock';

// Fake Screen Wake Lock API: records requests and releases
const installFakeWakeLock = () => {
  const locks = [];
  const wakeLock = {
    request: vi.fn(async () => {
      const listeners = [];
      const lock = {
        released: false,
        release: vi.fn(async () => {
          lock.released = true;
        }),
        addEventListener: (type, fn) => type === 'release' && listeners.push(fn),
        // The system lets go of the lock (e.g. a battery saver)
        releaseBySystem: () => {
          lock.released = true;
          listeners.forEach((fn) => fn());
        },
      };
      locks.push(lock);
      return lock;
    }),
  };
  Object.defineProperty(navigator, 'wakeLock', { value: wakeLock, configurable: true });
  return { wakeLock, locks };
};

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useWakeLock', () => {
  afterEach(() => {
    delete navigator.wakeLock;
    delete document.visibilityState; // back to jsdom's own value
  });

  describe('where the browser supports it', () => {
    let fake;

    beforeEach(() => {
      fake = installFakeWakeLock();
    });

    it('is reported as supported', () => {
      expect(isWakeLockSupported()).toBe(true);
    });

    it('holds a screen wake lock while active', async () => {
      renderHook(() => useWakeLock(true));
      await waitFor(() => expect(fake.wakeLock.request).toHaveBeenCalledWith('screen'));
    });

    it('does nothing while inactive', () => {
      renderHook(() => useWakeLock(false));
      expect(fake.wakeLock.request).not.toHaveBeenCalled();
    });

    it('releases the lock when it becomes inactive', async () => {
      const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
      await waitFor(() => expect(fake.locks).toHaveLength(1));

      rerender({ active: false });
      await waitFor(() => expect(fake.locks[0].release).toHaveBeenCalled());
    });

    it('releases the lock on unmount', async () => {
      const { unmount } = renderHook(() => useWakeLock(true));
      await waitFor(() => expect(fake.locks).toHaveLength(1));

      unmount();
      await waitFor(() => expect(fake.locks[0].release).toHaveBeenCalled());
    });

    it('asks again when the page becomes visible, since browsers release it when hidden', async () => {
      renderHook(() => useWakeLock(true));
      await waitFor(() => expect(fake.locks).toHaveLength(1));

      // The browser releases the lock while the page is hidden
      fake.locks[0].released = true;
      setVisibility('hidden');
      setVisibility('visible');
      await waitFor(() => expect(fake.wakeLock.request).toHaveBeenCalledTimes(2));
    });

    it('does not ask again on visibility changes after becoming inactive', async () => {
      const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
      await waitFor(() => expect(fake.locks).toHaveLength(1));
      rerender({ active: false });

      setVisibility('visible');
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(fake.wakeLock.request).toHaveBeenCalledTimes(1);
    });

    it('releases a lock that arrives after becoming inactive', async () => {
      let grant;
      fake.wakeLock.request.mockImplementationOnce(
        () => new Promise((resolve) => {
          grant = resolve;
        })
      );
      const lateLock = { released: false, release: vi.fn(async () => {}) };

      const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
      rerender({ active: false });
      grant(lateLock);

      await waitFor(() => expect(lateLock.release).toHaveBeenCalled());
    });

    it('reports that it failed if the request is refused (e.g. low battery), until inactive', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      fake.wakeLock.request.mockRejectedValueOnce(new Error('NotAllowedError'));

      const { result, rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
      await waitFor(() => expect(result.current).toBe(true));

      rerender({ active: false });
      expect(result.current).toBe(false);
    });

    it('does not report a failure while the lock is held', async () => {
      const { result } = renderHook(() => useWakeLock(true));
      await waitFor(() => expect(fake.locks).toHaveLength(1));
      expect(result.current).toBe(false);
    });

    it('asks again if the system lets go of the lock while the page is visible', async () => {
      renderHook(() => useWakeLock(true));
      await waitFor(() => expect(fake.locks).toHaveLength(1));

      fake.locks[0].releaseBySystem();
      await waitFor(() => expect(fake.locks).toHaveLength(2));
    });

    it('reports that it failed if asking again is refused', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useWakeLock(true));
      await waitFor(() => expect(fake.locks).toHaveLength(1));

      fake.wakeLock.request.mockRejectedValueOnce(new Error('NotAllowedError'));
      fake.locks[0].releaseBySystem();
      await waitFor(() => expect(result.current).toBe(true));
    });

    it('does not ask again after releasing the lock itself', async () => {
      const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
      await waitFor(() => expect(fake.locks).toHaveLength(1));

      rerender({ active: false });
      fake.locks[0].releaseBySystem();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(fake.wakeLock.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('where the browser does not support it', () => {
    it('is reported as unsupported and does nothing', () => {
      expect(isWakeLockSupported()).toBe(false);
      expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    });

    it('reports that it failed while active, since the screen may lock', () => {
      const { result, rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: false } });
      expect(result.current).toBe(false);

      rerender({ active: true });
      expect(result.current).toBe(true);
    });
  });
});
