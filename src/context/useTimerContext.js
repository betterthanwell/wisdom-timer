import { createContext, useContext } from 'react';

export const TimerContext = createContext();

// Custom hook to use the timer context
export const useTimerContext = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
};
