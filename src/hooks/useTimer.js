import { useState, useEffect, useRef, useCallback } from 'react';
import { sessionClock } from '../utils/testingTools';
import { countIntervalBellsDue } from '../utils/intervalBells';

// Background wake-ups are scheduled this far ahead at most (open-ended
// sessions last up to 24 h; the visible 100ms ticks cover the rest)
const WAKE_UP_HORIZON_MS = 6 * 60 * 60 * 1000;

// Durations are in seconds and may have fractions (a guided meditation lasts
// exactly as long as its recording); time left is kept in whole milliseconds
// and shown in whole seconds, rounded up
const toMs = (seconds) => Math.round(seconds * 1000);
const shownSeconds = (ms) => Math.ceil(ms / 1000);

export const useTimer = (initialDuration, onStart, onComplete, onIntervalBell) => {
  const [duration, setDuration] = useState(initialDuration);
  const [timeRemaining, setTimeRemaining] = useState(() => shownSeconds(toMs(initialDuration)));
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
  // The exact time left while not running (ms)
  const remainingMsRef = useRef(toMs(initialDuration));

  // Start the timer
  const start = useCallback(() => {
    // After a completed session, starting begins a new full session
    const remainingMs = isComplete ? toMs(duration) : remainingMsRef.current;
    if (remainingMs <= 0) return;
    const elapsed = (toMs(duration) - remainingMs) / 1000;

    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
    setTimeRemaining(shownSeconds(remainingMs));
    const now = sessionClock.now();
    startTimeRef.current = now;
    expectedEndTimeRef.current = now + remainingMs;
    setEndsAt(expectedEndTimeRef.current);
    // Count bells already due at this point as rung, so resuming (or enabling
    // interval bells while paused) doesn't immediately ring a catch-up bell
    intervalBellsRungRef.current = countIntervalBellsDue(
      elapsed,
      onIntervalBell?.interval,
      duration,
      onIntervalBell?.firstAt
    );

    // How long has been sat so far (s), e.g. to resume a recording there
    if (onStart) {
      onStart(elapsed);
    }
  }, [isComplete, duration, onStart, onIntervalBell]);

  // Take the exact time left from the clock (not the last displayed value,
  // which can be stale if ticks were throttled)
  const stopClock = useCallback(() => {
    remainingMsRef.current = Math.max(0, expectedEndTimeRef.current - sessionClock.now());
    setTimeRemaining(shownSeconds(remainingMsRef.current));
  }, []);

  // Pause the timer
  const pause = useCallback(() => {
    if (!isRunning) return;

    stopClock();
    setIsRunning(false);
    setIsPaused(true);
    setEndsAt(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isRunning, stopClock]);

  // Finish now (open-ended sitting): complete the session early, keeping
  // the time sat
  const finish = useCallback(() => {
    if (!isRunning && !isPaused) return;

    if (isRunning) stopClock();
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
  }, [isRunning, isPaused, onComplete, stopClock]);

  // Pause at a given point of the session (seconds sat), whatever the clock
  // says - also taking back a completion (call it from onComplete). Rescues
  // a guided session after an interruption: it resumes where the voice
  // stopped, even if the page only woke up later, or past the end.
  const pauseAt = useCallback((elapsed) => {
    remainingMsRef.current = Math.max(1, toMs(duration) - toMs(elapsed));
    setTimeRemaining(shownSeconds(remainingMsRef.current));
    setIsRunning(false);
    setIsPaused(true);
    setIsComplete(false);
    setEndsAt(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [duration]);

  // Reset the timer
  const reset = useCallback(() => {
    setIsRunning(false);
    setEndsAt(null);
    setIsPaused(false);
    setIsComplete(false);
    remainingMsRef.current = toMs(duration);
    setTimeRemaining(shownSeconds(remainingMsRef.current));
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
      remainingMsRef.current = toMs(newDuration);
      setTimeRemaining(shownSeconds(remainingMsRef.current));
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
      const remaining = shownSeconds(Math.max(0, expectedEndTimeRef.current - sessionClock.now()));

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
      wakeUps.push(setTimeout(tick, Math.max(0, sessionClock.realDelay(time - sessionClock.now()))));
    };
    const endTime = expectedEndTimeRef.current;
    wakeAt(endTime);
    if (intervalSeconds > 0) {
      for (let elapsed = firstBellSeconds; elapsed < duration; elapsed += intervalSeconds) {
        const bellTime = endTime - (duration - elapsed) * 1000;
        if (bellTime - sessionClock.now() > WAKE_UP_HORIZON_MS) break;
        if (bellTime > sessionClock.now()) wakeAt(bellTime);
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
    pauseAt,
    finish,
    reset,
    updateDuration,
    progress: duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0,
  };
};
