import { useEffect, useState } from 'react';

export const isWakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// Keeps the screen on while `active` (Screen Wake Lock API). Browsers release
// the lock whenever the page is hidden, so it's requested again when the page
// becomes visible - and when the system lets go of it while visible.
//
// Returns whether it failed: true while active if the browser can't keep the
// screen on, or refused to (e.g. low battery). The screen may then lock by
// itself, and a locked phone may not ring the end bell on time.
export const useWakeLock = (active) => {
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    if (!active || !isWakeLockSupported()) return;

    let lock = null;
    let stopped = false;

    const request = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      if (lock && !lock.released) return;

      try {
        const granted = await navigator.wakeLock.request('screen');
        if (stopped) {
          granted.release().catch(() => {});
          return;
        }
        lock = granted;
        // Released by the system while the page stays visible: ask again
        // (a release because the page was hidden waits for it to be visible)
        granted.addEventListener?.('release', request);
        setRefused(false);
      } catch (error) {
        console.warn('Could not keep the screen awake:', error);
        if (!stopped) setRefused(true);
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
      setRefused(false);
    };
  }, [active]);

  return active && (!isWakeLockSupported() || refused);
};
