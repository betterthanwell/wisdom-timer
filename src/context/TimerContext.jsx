import { useReducer, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TimerContext } from './useTimerContext';

// Action types
const ActionTypes = {
  SET_DURATION: 'SET_DURATION',
  SET_INTERVAL_BELLS: 'SET_INTERVAL_BELLS',
  SET_INTERVAL_DURATION: 'SET_INTERVAL_DURATION',
  SET_AMBIENT_SOUND: 'SET_AMBIENT_SOUND',
  SET_AMBIENT_VOLUME: 'SET_AMBIENT_VOLUME',
  SET_BELL_VOLUME: 'SET_BELL_VOLUME',
};

// Initial state
const initialState = {
  duration: 2700, // 45 minutes default
  presetDurations: [1800, 2700, 3600, 5400], // 30, 45, 60, 90 minutes
  intervalBellsEnabled: false,
  intervalDuration: 300, // 5 minutes
  selectedAmbient: null,
  ambientVolume: 0.5,
  bellVolume: 0.7,
};

// Reducer
const timerReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_DURATION:
      return { ...state, duration: action.payload };

    case ActionTypes.SET_INTERVAL_BELLS:
      return { ...state, intervalBellsEnabled: action.payload };

    case ActionTypes.SET_INTERVAL_DURATION:
      return { ...state, intervalDuration: action.payload };

    case ActionTypes.SET_AMBIENT_SOUND:
      return { ...state, selectedAmbient: action.payload };

    case ActionTypes.SET_AMBIENT_VOLUME:
      return { ...state, ambientVolume: action.payload };

    case ActionTypes.SET_BELL_VOLUME:
      return { ...state, bellVolume: action.payload };

    default:
      return state;
  }
};

// Provider component
export const TimerProvider = ({ children }) => {
  const [savedSettings, setSavedSettings] = useLocalStorage('wisdomTimerSettings', {});
  // Start from saved settings so the first render already reflects them
  const [state, dispatch] = useReducer(timerReducer, savedSettings, (saved) => ({
    ...initialState,
    ...saved,
  }));

  // Save settings to localStorage when state changes
  useEffect(() => {
    setSavedSettings({
      duration: state.duration,
      intervalBellsEnabled: state.intervalBellsEnabled,
      intervalDuration: state.intervalDuration,
      selectedAmbient: state.selectedAmbient,
      ambientVolume: state.ambientVolume,
      bellVolume: state.bellVolume,
    });
  }, [
    state.duration,
    state.intervalBellsEnabled,
    state.intervalDuration,
    state.selectedAmbient,
    state.ambientVolume,
    state.bellVolume,
    setSavedSettings,
  ]);

  // Actions
  const actions = {
    setDuration: (duration) => dispatch({ type: ActionTypes.SET_DURATION, payload: duration }),
    setIntervalBells: (enabled) => dispatch({ type: ActionTypes.SET_INTERVAL_BELLS, payload: enabled }),
    setIntervalDuration: (duration) => dispatch({ type: ActionTypes.SET_INTERVAL_DURATION, payload: duration }),
    setAmbientSound: (sound) => dispatch({ type: ActionTypes.SET_AMBIENT_SOUND, payload: sound }),
    setAmbientVolume: (volume) => dispatch({ type: ActionTypes.SET_AMBIENT_VOLUME, payload: volume }),
    setBellVolume: (volume) => dispatch({ type: ActionTypes.SET_BELL_VOLUME, payload: volume }),
  };

  return (
    <TimerContext.Provider value={{ state, actions }}>
      {children}
    </TimerContext.Provider>
  );
};
