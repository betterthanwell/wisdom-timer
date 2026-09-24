import { useState, useEffect, useRef, useCallback } from 'react';
import { countIntervalBellsDue } from '../utils/intervalBells';

export const useTimer = (initialDuration, onStart, onComplete, onIntervalBell) => {
  const [duration, setDuration] = useState(initialDuration);
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  // Started, then paused - the session is still in progress
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const expectedEndTimeRef = useRef(null);
  const intervalBellsRungRef = useRef(0);

  // Start the timer
  const start = useCallback(() => {
    // After a completed session, starting begins a new full session
    const remaining = isComplete ? duration : timeRemaining;
    if (remaining <= 0) return;

    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
    setTimeRemaining(remaining);
    const now = Date.now();
    startTimeRef.current = now;
    expectedEndTimeRef.current = now + (remaining * 1000);
    // Count bells already due at this point as rung, so resuming (or enabling
    // interval bells while paused) doesn't immediately ring a catch-up bell
    intervalBellsRungRef.current = countIntervalBellsDue(
      duration - remaining,
      onIntervalBell?.interval,
      duration
    );

    if (onStart) {
      onStart();
    }
  }, [isComplete, timeRemaining, duration, onStart, onIntervalBell]);

  // Pause the timer
  const pause = useCallback(() => {
    setIsRunning(false);
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset the timer
  const reset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setTimeRemaining(duration);
    intervalBellsRungRef.current = 0;

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
    if (!isRunning || !onIntervalBell) return;

    const due = countIntervalBellsDue(duration - timeRemaining, onIntervalBell.interval, duration);
    // If ticks were skipped (e.g. a throttled background tab), ring once rather than several times
    if (due > intervalBellsRungRef.current) {
      intervalBellsRungRef.current = due;
      onIntervalBell.callback?.();
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
    isPaused,
    isComplete,
    start,
    pause,
    reset,
    updateDuration,
    progress: duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0,
  };
};
