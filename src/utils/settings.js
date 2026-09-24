import { AUDIO_SOURCES } from '../constants/audioSources';

// Settling-in countdown choices, in seconds (0 = off)
export const SETTLE_SECONDS = [0, 10, 20, 30, 60];

const isWholeNumber = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const isVolume = (value) => typeof value === 'number' && value >= 0 && value <= 1;

// Checks for each setting that can be saved. Anything else in storage is ignored.
const validators = {
  duration: (value) => isWholeNumber(value, 1, 99 * 60 + 59),
  intervalBellsEnabled: (value) => typeof value === 'boolean',
  intervalDuration: (value) => isWholeNumber(value, 60, 30 * 60) && value % 60 === 0,
  selectedAmbient: (value) => value === null || Object.hasOwn(AUDIO_SOURCES.ambient, value),
  ambientVolume: isVolume,
  bellVolume: isVolume,
  keepScreenAwake: (value) => typeof value === 'boolean',
  settleSeconds: (value) => SETTLE_SECONDS.includes(value),
};

// The settings that are saved: exactly those with a validator
export const pickSavedSettings = (settings) =>
  Object.fromEntries(Object.keys(validators).map((key) => [key, settings[key]]));

// Merge saved settings over the defaults, keeping only values that are valid
// (storage can hold old, hand-edited or corrupted data)
export const sanitizeSettings = (saved, defaults) => {
  const result = { ...defaults };
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
    return result;
  }

  for (const [key, isValid] of Object.entries(validators)) {
    if (Object.hasOwn(saved, key) && isValid(saved[key])) {
      result[key] = saved[key];
    }
  }
  return result;
};
