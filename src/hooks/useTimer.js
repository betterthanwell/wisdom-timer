import { useState, useEffect, useRef, useCallback } from 'react';
import { countIntervalBellsDue } from '../utils/intervalBells';

// Background wake-ups are scheduled this far ahead at most (open-ended
// sessions last up to 24 h; the visible 100ms ticks cover the rest)
const WAKE_UP_HORIZON_MS = 6 * 60 * 60 * 1000;

export const useTimer = (initialDuration, onStart, onComplete, onIntervalBell) => {
  const [duration, setDuration] = useState(initialDuration);
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  // Started, then paused - the session is still in progress
  const [isPaused, setIsPaused] = useState(false);
  // When the running session will end (timestamp), or null when not running
  const [endsAt, setEndsAt] = useState(null);

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
    setEndsAt(expectedEndTimeRef.current);
    // Count bells already due at this point as rung, so resuming (or enabling
    // interval bells while paused) doesn't immediately ring a catch-up bell
    intervalBellsRungRef.current = countIntervalBellsDue(
      duration - remaining,
      onIntervalBell?.interval,
      duration,
      onIntervalBell?.firstAt
    );

    if (onStart) {
      onStart();
    }
  }, [isComplete, timeRemaining, duration, onStart, onIntervalBell]);

  // Pause the timer
  const pause = useCallback(() => {
    if (!isRunning) return;

    // Take the time left from the clock, not the last displayed value, which
    // can be stale if ticks were throttled
    setTimeRemaining(Math.max(0, Math.ceil((expectedEndTimeRef.current - Date.now()) / 1000)));
    setIsRunning(false);
    setIsPaused(true);
    setEndsAt(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isRunning]);

  // Finish now (open-ended sitting): complete the session early, keeping
  // the time sat
  const finish = useCallback(() => {
    if (!isRunning && !isPaused) return;

    if (isRunning) {
      setTimeRemaining(Math.max(0, Math.ceil((expectedEndTimeRef.current - Date.now()) / 1000)));
    }
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(true);
    setEndsAt(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (onComplete) {
      onComplete();
    }
  }, [isRunning, isPaused, onComplete]);

  // Reset the timer
  const reset = useCallback(() => {
    setIsRunning(false);
    setEndsAt(null);
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
  const intervalSeconds = onIntervalBell?.interval;
  const firstBellSeconds = onIntervalBell?.firstAt ?? intervalSeconds;
  useEffect(() => {
    if (!isRunning) return;

    let finished = false;
    const wakeUps = [];

    const stopTicking = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      wakeUps.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', tick);
    };

    function tick() {
      if (finished) return;
      const remaining = Math.max(0, Math.ceil((expectedEndTimeRef.current - Date.now()) / 1000));

      setTimeRemaining(remaining);

      // Check for completion
      if (remaining === 0) {
        finished = true;
        stopTicking();
        setIsRunning(false);
        setIsComplete(true);
        setEndsAt(null);

        if (onComplete) {
          onComplete();
        }
      }
    }

    intervalRef.current = setInterval(tick, 100); // 100ms for smooth updates

    // Background tabs throttle repeating timers hard (Chrome: down to once a
    // minute), but one-off timers much less. So also wake up exactly at the
    // end and at each interval bell, and whenever the tab becomes visible.
    const wakeAt = (time) => {
      wakeUps.push(setTimeout(tick, Math.max(0, time - Date.now())));
    };
    const endTime = expectedEndTimeRef.current;
    wakeAt(endTime);
    if (intervalSeconds > 0) {
      for (let elapsed = firstBellSeconds; elapsed < duration; elapsed += intervalSeconds) {
        const bellTime = endTime - (duration - elapsed) * 1000;
        if (bellTime - Date.now() > WAKE_UP_HORIZON_MS) break;
        if (bellTime > Date.now()) wakeAt(bellTime);
      }
    }
    document.addEventListener('visibilitychange', tick);

    return stopTicking;
  }, [isRunning, onComplete, duration, intervalSeconds, firstBellSeconds]);

  // Interval bell checker
  useEffect(() => {
    if (!isRunning || !onIntervalBell) return;

    const due = countIntervalBellsDue(
      duration - timeRemaining,
      onIntervalBell.interval,
      duration,
      onIntervalBell.firstAt
    );
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
    endsAt,
    start,
    pause,
    finish,
    reset,
    updateDuration,
    progress: duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0,
  };
};
