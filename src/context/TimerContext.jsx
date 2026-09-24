import { useReducer, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TimerContext } from './useTimerContext';
import { pickSavedSettings, sanitizeSettings } from '../utils/settings';

// Default settings
const initialState = {
  duration: 2700, // 45 minutes default
  presetDurations: [1800, 2700, 3600, 5400], // 30, 45, 60, 90 minutes
  intervalBellsEnabled: false,
  intervalDuration: 600, // 10 minutes
  intervalStart: 300, // first woodblock after 5 minutes
  selectedAmbient: null,
  ambientVolume: 0.5,
  bellVolume: 0.7,
  keepScreenAwake: true,
  settleSeconds: 0, // settling-in countdown before the start bell (off)
  // How many times each bell rings (1-3)
  startStrikes: 1,
  intervalStrikes: 1,
  endStrikes: 1,
  gentleEnding: false, // fade ambient sound out over the last minute
  openEnded: false, // count up until Finish instead of counting down
  showBellStrikes: false, // bell strike choices tucked away (UI only)
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
    setIntervalStart: (seconds) => setSetting('intervalStart', seconds),
    setAmbientSound: (sound) => setSetting('selectedAmbient', sound),
    setAmbientVolume: (volume) => setSetting('ambientVolume', volume),
    setBellVolume: (volume) => setSetting('bellVolume', volume),
    setKeepScreenAwake: (enabled) => setSetting('keepScreenAwake', enabled),
    setSettleSeconds: (seconds) => setSetting('settleSeconds', seconds),
    setBellStrikes: (bell, strikes) => setSetting(`${bell}Strikes`, strikes),
    setGentleEnding: (enabled) => setSetting('gentleEnding', enabled),
    setOpenEnded: (enabled) => setSetting('openEnded', enabled),
    setShowBellStrikes: (shown) => setSetting('showBellStrikes', shown),
  };

  return (
    <TimerContext.Provider value={{ state, actions }}>
      {children}
    </TimerContext.Provider>
  );
};
