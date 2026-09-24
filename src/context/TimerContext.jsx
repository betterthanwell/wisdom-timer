import { useReducer, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TimerContext } from './useTimerContext';
import { pickSavedSettings, sanitizeSettings } from '../utils/settings';

// Default settings
const initialState = {
  duration: 2700, // 45 minutes default
  presetDurations: [1800, 2700, 3600, 5400], // 30, 45, 60, 90 minutes
  intervalBellsEnabled: false,
  intervalDuration: 300, // 5 minutes
  selectedAmbient: null,
  ambientVolume: 0.5,
  bellVolume: 0.7,
  keepScreenAwake: true,
};

// Reducer: every setting change is { type: 'SET_SETTING', key, value }
const timerReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SETTING':
      return { ...state, [action.key]: action.value };

    default:
      return state;
  }
};

// Provider component
export const TimerProvider = ({ children }) => {
  const [savedSettings, setSavedSettings] = useLocalStorage('wisdomTimerSettings', {});
  // Start from saved settings so the first render already reflects them;
  // invalid or unknown saved values fall back to the defaults
  const [state, dispatch] = useReducer(timerReducer, savedSettings, (saved) =>
    sanitizeSettings(saved, initialState)
  );

  // Save settings to localStorage when they change (every setting that has
  // a validator in utils/settings.js is saved)
  useEffect(() => {
    setSavedSettings(pickSavedSettings(state));
  }, [state, setSavedSettings]);

  // Actions
  const setSetting = (key, value) => dispatch({ type: 'SET_SETTING', key, value });
  const actions = {
    setDuration: (duration) => setSetting('duration', duration),
    setIntervalBells: (enabled) => setSetting('intervalBellsEnabled', enabled),
    setIntervalDuration: (duration) => setSetting('intervalDuration', duration),
    setAmbientSound: (sound) => setSetting('selectedAmbient', sound),
    setAmbientVolume: (volume) => setSetting('ambientVolume', volume),
    setBellVolume: (volume) => setSetting('bellVolume', volume),
    setKeepScreenAwake: (enabled) => setSetting('keepScreenAwake', enabled),
  };

  return (
    <TimerContext.Provider value={{ state, actions }}>
      {children}
    </TimerContext.Provider>
  );
};
