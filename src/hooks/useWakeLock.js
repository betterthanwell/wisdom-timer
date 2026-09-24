import { useEffect } from 'react';

export const isWakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// Keeps the screen on while `active` (Screen Wake Lock API). Browsers release
// the lock whenever the page is hidden, so it's requested again when the page
// becomes visible. Does nothing where the API isn't available.
export const useWakeLock = (active) => {
  useEffect(() => {
    if (!active || !isWakeLockSupported()) return;

    let lock = null;
    let stopped = false;

    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      if (lock && !lock.released) return;

      try {
        const granted = await navigator.wakeLock.request('screen');
        if (stopped) {
          granted.release().catch(() => {});
        } else {
          lock = granted;
        }
      } catch (error) {
        // E.g. refused on low battery - the session carries on without it
        console.warn('Could not keep the screen awake:', error);
      }
    };

    request();
    document.addEventListener('visibilitychange', request);

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', request);
      if (lock && !lock.released) {
        lock.release().catch(() => {});
      }
    };
  }, [active]);
};
