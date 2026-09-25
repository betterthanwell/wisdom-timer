// Registers the service worker (src/sw.js), which keeps the app and its bells
// on the device for offline use. Production builds only: in development it
// would serve stale files from its cache.
export const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').catch((error) => {
    // The app still works online; it just isn't available offline
    console.warn('Offline use is not available:', error);
  });
};
