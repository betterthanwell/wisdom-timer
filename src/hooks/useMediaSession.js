import { useEffect, useRef } from 'react';

const isMediaSessionSupported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;

const ARTWORK = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
];

const setHandler = (action, handler) => {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // An action this browser doesn't know
  }
};

// The lock screen's (and headphones') play/pause, through the Media Session
// API. iOS shows them while the ambient sound or a guided voice plays; left
// to itself it would pause only that sound, with the clock running on.
// `status`: 'playing', 'paused' or null (no session: nothing shown).
// `title`: shown on the lock screen, with "Wisdom Timer" under it.
// Does nothing where the API isn't available.
export const useMediaSession = ({ status, title, onPlay, onPause }) => {
  // Registered once; they call the latest handlers
  const handlersRef = useRef({ onPlay, onPause });
  useEffect(() => {
    handlersRef.current = { onPlay, onPause };
  }, [onPlay, onPause]);

  useEffect(() => {
    if (!isMediaSessionSupported()) return;
    setHandler('play', () => handlersRef.current.onPlay());
    setHandler('pause', () => handlersRef.current.onPause());
    return () => {
      setHandler('play', null);
      setHandler('pause', null);
    };
  }, []);

  useEffect(() => {
    if (!isMediaSessionSupported()) return;
    const session = navigator.mediaSession;
    session.playbackState = status ?? 'none';
    session.metadata = status && typeof MediaMetadata !== 'undefined'
      ? new MediaMetadata({ title, artist: 'Wisdom Timer', artwork: ARTWORK })
      : null;
  }, [status, title]);
};
