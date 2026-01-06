import { createContext, useContext, useReducer, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const TimerContext = createContext();

// Action types
const ActionTypes = {
  SET_DURATION: 'SET_DURATION',
  SET_INTERVAL_BELLS: 'SET_INTERVAL_BELLS',
  SET_INTERVAL_DURATION: 'SET_INTERVAL_DURATION',
  SET_AMBIENT_SOUND: 'SET_AMBIENT_SOUND',
  SET_AMBIENT_VOLUME: 'SET_AMBIENT_VOLUME',
  SET_BELL_VOLUME: 'SET_BELL_VOLUME',
  LOAD_SETTINGS: 'LOAD_SETTINGS',
};

// Initial state
const initialState = {
  duration: 600, // 10 minutes default
  presetDurations: [600, 1800, 2700, 3600], // 10, 30, 45, 60 minutes
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

    case ActionTypes.LOAD_SETTINGS:
      return { ...state, ...action.payload };

    default:
      return state;
  }
};

// Provider component
export const TimerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(timerReducer, initialState);
  const [savedSettings, setSavedSettings] = useLocalStorage('wisdomTimerSettings', {});

  // Load settings from localStorage on mount
  useEffect(() => {
    if (Object.keys(savedSettings).length > 0) {
      dispatch({ type: ActionTypes.LOAD_SETTINGS, payload: savedSettings });
    }
  }, []);

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

// Custom hook to use the timer context
export const useTimerContext = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
};
