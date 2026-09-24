import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSettleCountdown } from './useSettleCountdown';

const advanceSeconds = (seconds) => {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

describe('useSettleCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is idle at first', () => {
    const { result } = renderHook(() => useSettleCountdown());
    expect(result.current.isSettling).toBe(false);
  });

  it('counts down, then calls back once', () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useSettleCountdown());

    act(() => result.current.begin(10, onDone));
    expect(result.current.isSettling).toBe(true);
    expect(result.current.settleRemaining).toBe(10);

    advanceSeconds(4);
    expect(result.current.settleRemaining).toBe(6);
    expect(onDone).not.toHaveBeenCalled();

    advanceSeconds(6);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.isSettling).toBe(false);

    advanceSeconds(10);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('never calls back when cancelled', () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useSettleCountdown());

    act(() => result.current.begin(10, onDone));
    advanceSeconds(5);
    act(() => result.current.cancel());
    expect(result.current.isSettling).toBe(false);

    advanceSeconds(20);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('finishes on time even if the repeating timer is throttled (background tab)', () => {
    vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 0);
    try {
      const onDone = vi.fn();
      const { result } = renderHook(() => useSettleCountdown());

      act(() => result.current.begin(30, onDone));
      advanceSeconds(29);
      expect(onDone).not.toHaveBeenCalled();
      advanceSeconds(1);
      expect(onDone).toHaveBeenCalledTimes(1);
    } finally {
      vi.mocked(globalThis.setInterval).mockRestore();
    }
  });
});
