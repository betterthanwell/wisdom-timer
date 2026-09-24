import { useCallback, useState } from 'react';

// Local calendar day, e.g. "Thu Sep 24 2026"
const today = () => new Date().toDateString();

// Counts sessions completed today. Kept in memory only - it starts over on
// reload, and on the first session start (or completion) of a new day.
export const useSessionCounter = () => {
  const [counter, setCounter] = useState(() => ({ day: today(), completed: 0 }));

  const startNewDayIfNeeded = useCallback(() => {
    const day = today();
    setCounter((current) => (current.day === day ? current : { day, completed: 0 }));
  }, []);

  const recordCompleted = useCallback(() => {
    const day = today();
    setCounter((current) => ({
      day,
      completed: current.day === day ? current.completed + 1 : 1,
    }));
  }, []);

  return { completedToday: counter.completed, startNewDayIfNeeded, recordCompleted };
};
