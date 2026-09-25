export const AUDIO_SOURCES = {
  bells: {
    start: '/audio/bells/bell-start.mp3',
    interval: '/audio/bells/bell-interval.mp3',
    end: '/audio/bells/bell-end.mp3',
  },
  ambient: {
    rain: { path: '/audio/ambient/rain.mp3', name: 'Rain' },
    ocean: { path: '/audio/ambient/ocean.mp3', name: 'Ocean Waves' },
    forest: { path: '/audio/ambient/forest.mp3', name: 'Forest' },
  },
};

// Cache Storage cache holding the ambient sounds downloaded so far (kept
// across deploys; the service worker plays them from there when offline).
// Change the name if an ambient file changes, so devices download it again.
export const AMBIENT_CACHE = 'ambient-sounds-v1';

export const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Rain', path: '/audio/ambient/rain.mp3', icon: 'Cloud' },
  { id: 'ocean', name: 'Ocean Waves', path: '/audio/ambient/ocean.mp3', icon: 'Waves' },
  { id: 'forest', name: 'Forest', path: '/audio/ambient/forest.mp3', icon: 'Trees' },
];
