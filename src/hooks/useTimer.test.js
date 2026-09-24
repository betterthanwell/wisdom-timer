import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTimer } from './useTimer';

// Advance the fake clock one second at a time so React re-renders between
// ticks, like it does in the browser
const advanceSeconds = (seconds) => {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

const renderTimer = (duration, intervalBell = null) => {
  const onStart = vi.fn();
  const onComplete = vi.fn();
  const hook = renderHook(
    ({ bell }) => useTimer(duration, onStart, onComplete, bell),
    { initialProps: { bell: intervalBell } }
  );
  return { ...hook, onStart, onComplete };
};

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down and completes once', () => {
    const { result, onStart, onComplete } = renderTimer(10);

    act(() => result.current.start());
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(result.current.isRunning).toBe(true);

    advanceSeconds(10);
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isComplete).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('starts a new full session when started after completing', () => {
    const bell = { interval: 4, callback: vi.fn() };
    const { result, onStart, onComplete } = renderTimer(10, bell);

    act(() => result.current.start());
    advanceSeconds(10);
    expect(result.current.isComplete).toBe(true);
    expect(bell.callback).toHaveBeenCalledTimes(2); // 0:04, 0:08

    act(() => result.current.start());
    expect(onStart).toHaveBeenCalledTimes(2);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.isRunning).toBe(true);
    expect(result.current.timeRemaining).toBe(10);

    advanceSeconds(10);
    expect(bell.callback).toHaveBeenCalledTimes(4); // interval bells ring again
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('reports paused only between pause and the next start or reset', () => {
    const { result } = renderTimer(60);
    expect(result.current.isPaused).toBe(false);

    act(() => result.current.start());
    expect(result.current.isPaused).toBe(false);

    act(() => result.current.pause());
    expect(result.current.isPaused).toBe(true);
    expect(result.current.isRunning).toBe(false);

    act(() => result.current.start());
    expect(result.current.isPaused).toBe(false);

    act(() => result.current.pause());
    act(() => result.current.reset());
    expect(result.current.isPaused).toBe(false);
  });

  describe('interval bells', () => {
    it('rings every interval, but not at the end', () => {
      const bell = { interval: 120, callback: vi.fn() };
      const { result, onComplete } = renderTimer(600, bell);

      act(() => result.current.start());

      advanceSeconds(119);
      expect(bell.callback).not.toHaveBeenCalled();
      advanceSeconds(1);
      expect(bell.callback).toHaveBeenCalledTimes(1); // 2:00

      advanceSeconds(480);
      // 4:00, 6:00, 8:00 - and at 10:00 only the end bell
      expect(bell.callback).toHaveBeenCalledTimes(4);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('keeps ringing on schedule after pause and resume', () => {
      const bell = { interval: 60, callback: vi.fn() };
      const { result } = renderTimer(300, bell);

      act(() => result.current.start());
      advanceSeconds(90);
      expect(bell.callback).toHaveBeenCalledTimes(1); // 1:00

      act(() => result.current.pause());
      advanceSeconds(600); // time spent paused doesn't count
      expect(bell.callback).toHaveBeenCalledTimes(1);

      act(() => result.current.start());
      expect(bell.callback).toHaveBeenCalledTimes(1); // no extra bell on resume
      advanceSeconds(30);
      expect(bell.callback).toHaveBeenCalledTimes(2); // 2:00 elapsed
    });

    it('does not ring a catch-up bell when enabled while paused', () => {
      const { result, rerender } = renderTimer(600, null);

      act(() => result.current.start());
      advanceSeconds(250);
      act(() => result.current.pause());

      // Enable bells every minute at 4:10 elapsed - 4 bells are "overdue"
      const bell = { interval: 60, callback: vi.fn() };
      rerender({ bell });
      act(() => result.current.start());
      advanceSeconds(1);
      expect(bell.callback).not.toHaveBeenCalled();

      advanceSeconds(49); // 5:00 elapsed
      expect(bell.callback).toHaveBeenCalledTimes(1);
    });

    it('starts counting again after reset', () => {
      const bell = { interval: 60, callback: vi.fn() };
      const { result } = renderTimer(300, bell);

      act(() => result.current.start());
      advanceSeconds(130);
      expect(bell.callback).toHaveBeenCalledTimes(2);

      act(() => result.current.reset());
      act(() => result.current.start());
      advanceSeconds(60);
      expect(bell.callback).toHaveBeenCalledTimes(3);
    });

    it('rings once, not several times, if the tab was throttled past multiple bells', () => {
      const bell = { interval: 60, callback: vi.fn() };
      const { result } = renderTimer(600, bell);

      act(() => result.current.start());
      // Simulate a background tab: the wall clock jumps 3.5 minutes between ticks
      act(() => {
        vi.setSystemTime(Date.now() + 210_000);
      });
      advanceSeconds(1);
      expect(bell.callback).toHaveBeenCalledTimes(1);

      advanceSeconds(30); // 4:00 elapsed
      expect(bell.callback).toHaveBeenCalledTimes(2);
    });
  });
});
