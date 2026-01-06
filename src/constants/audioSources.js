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
    whiteNoise: { path: '/audio/ambient/white-noise.mp3', name: 'White Noise' },
  },
};

export const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Rain', path: '/audio/ambient/rain.mp3', icon: 'Cloud' },
  { id: 'ocean', name: 'Ocean Waves', path: '/audio/ambient/ocean.mp3', icon: 'Waves' },
  { id: 'forest', name: 'Forest', path: '/audio/ambient/forest.mp3', icon: 'Trees' },
  { id: 'whiteNoise', name: 'White Noise', path: '/audio/ambient/white-noise.mp3', icon: 'Radio' },
];
