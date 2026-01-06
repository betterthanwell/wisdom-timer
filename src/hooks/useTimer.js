import { useState, useEffect, useRef, useCallback } from 'react';

export const useTimer = (initialDuration, onStart, onComplete, onIntervalBell) => {
  const [duration, setDuration] = useState(initialDuration);
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const expectedEndTimeRef = useRef(null);
  const lastIntervalBellRef = useRef(0);

  // Start the timer
  const start = useCallback(() => {
    if (timeRemaining <= 0) return;

    setIsRunning(true);
    setIsComplete(false);
    const now = Date.now();
    startTimeRef.current = now;
    expectedEndTimeRef.current = now + (timeRemaining * 1000);
    lastIntervalBellRef.current = duration;

    if (onStart) {
      onStart();
    }
  }, [timeRemaining, duration, onStart]);

  // Pause the timer
  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset the timer
  const reset = useCallback(() => {
    setIsRunning(false);
    setIsComplete(false);
    setTimeRemaining(duration);
    lastIntervalBellRef.current = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [duration]);

  // Update duration (and reset timer if not running)
  const updateDuration = useCallback((newDuration) => {
    setDuration(newDuration);
    if (!isRunning) {
      setTimeRemaining(newDuration);
      setIsComplete(false);
    }
  }, [isRunning]);

  // Main timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((expectedEndTimeRef.current - now) / 1000));

        setTimeRemaining(remaining);

        // Check for completion
        if (remaining === 0) {
          setIsRunning(false);
          setIsComplete(true);
          clearInterval(intervalRef.current);
          intervalRef.current = null;

          if (onComplete) {
            onComplete();
          }
        }
      }, 100); // 100ms for smooth updates

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isRunning, onComplete]);

  // Interval bell checker
  useEffect(() => {
    if (isRunning && onIntervalBell && timeRemaining > 0) {
      const elapsed = duration - timeRemaining;
      const timeSinceLastBell = duration - lastIntervalBellRef.current;

      // Check if we should play an interval bell
      if (timeSinceLastBell > 0 && elapsed > 0 && elapsed % onIntervalBell.interval === 0) {
        if (lastIntervalBellRef.current !== timeRemaining) {
          lastIntervalBellRef.current = timeRemaining;
          if (onIntervalBell.callback) {
            onIntervalBell.callback();
          }
        }
      }
    }
  }, [timeRemaining, isRunning, duration, onIntervalBell]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    duration,
    timeRemaining,
    isRunning,
    isComplete,
    start,
    pause,
    reset,
    updateDuration,
    progress: duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0,
  };
};
