export const AUDIO_SOURCES = {
  bells: {
    start: '/audio/bells/bell-start.mp3',
    interval: '/audio/bells/bell-interval.mp3',
    end: '/audio/bells/bell-end.mp3',
  },
  // In the order of their buttons; `icon`: a name in AmbientSoundSelector's iconMap
  ambient: {
    rain: { path: '/audio/ambient/rain.mp3', name: 'Rain', icon: 'Cloud' },
    ocean: { path: '/audio/ambient/ocean.mp3', name: 'Ocean Waves', icon: 'Waves' },
    forest: { path: '/audio/ambient/forest.mp3', name: 'Forest', icon: 'Trees' },
  },
  // Guided meditations by Thanissaro Bhikkhu (dhammatalks.org), unmodified.
  // `seconds`: the recording's length as browsers decode it (measured in
  // Chromium; the session lasts exactly this long after the lead-in).
  // `length`: how it's described in the settings - roughly, in words.
  guided: {
    metta: { path: '/audio/guided/metta.mp3', name: 'Metta', length: 'Four minutes', seconds: 248.576 },
    'breath-12': { path: '/audio/guided/breath-12.mp3', name: 'Breath, short', length: '12 minutes', seconds: 736.311 },
    'breath-30': { path: '/audio/guided/breath-30.mp3', name: 'Breath, older', length: 'Half an hour', seconds: 1772.022 },
    'breath-40': { path: '/audio/guided/breath-40.mp3', name: 'Breath, with leaving', length: '40 minutes', seconds: 2399.985 },
  },
};

// Guided mode: the start bell rings, the voice begins this long after it
export const GUIDED_LEAD_IN_SECONDS = 15;

// Where the guided meditations come from (shown under the choices, one line each)
export const GUIDED_SOURCE = {
  credit: ['Guided by Thanissaro Bhikkhu', 'dhammatalks.org · CC BY-NC 4.0'],
  url: 'https://www.dhammatalks.org/Archive/guided_meditations/guided_meditations.html',
};

// Sounds downloaded when chosen and kept on the device (in AMBIENT_CACHE)
export const DOWNLOADED_SOUNDS = { ...AUDIO_SOURCES.ambient, ...AUDIO_SOURCES.guided };

// Cache Storage cache holding the ambient sounds and guided meditations
// downloaded so far (kept across deploys; the service worker plays them from
// there when offline).
// Change the name if an ambient file changes, so devices download it again.
export const AMBIENT_CACHE = 'ambient-sounds-v1';

// The ambient sound buttons
export const AMBIENT_SOUNDS = Object.entries(AUDIO_SOURCES.ambient).map(([id, sound]) => ({ id, ...sound }));
