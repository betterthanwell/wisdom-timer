import { useState, useCallback, useRef } from 'react';

export const useWakeLock = () => {
  const [isSupported] = useState(() => 'wakeLock' in navigator);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return false;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);

      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false);
      });

      return true;
    } catch (e) {
      console.warn('Wake lock request failed:', e.message);
      return false;
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
      } catch (e) {
        // Already released
      }
    }
  }, []);

  return { isSupported, isActive, requestWakeLock, releaseWakeLock };
};
