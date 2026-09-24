import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSessionCounter } from './useSessionCounter';

describe('useSessionCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 21, 0)); // 24 Sep, 21:00 local time
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at zero', () => {
    const { result } = renderHook(() => useSessionCounter());
    expect(result.current.completedToday).toBe(0);
  });

  it('counts completed sessions', () => {
    const { result } = renderHook(() => useSessionCounter());

    act(() => result.current.recordCompleted());
    act(() => result.current.recordCompleted());
    expect(result.current.completedToday).toBe(2);
  });

  it('starts over on a new day when a session starts', () => {
    const { result } = renderHook(() => useSessionCounter());
    act(() => result.current.recordCompleted());
    act(() => result.current.recordCompleted());

    vi.setSystemTime(new Date(2026, 8, 25, 6, 30)); // next morning
    act(() => result.current.startNewDayIfNeeded());
    expect(result.current.completedToday).toBe(0);
  });

  it('keeps counting within the same day', () => {
    const { result } = renderHook(() => useSessionCounter());
    act(() => result.current.recordCompleted());

    vi.setSystemTime(new Date(2026, 8, 24, 23, 59));
    act(() => result.current.startNewDayIfNeeded());
    expect(result.current.completedToday).toBe(1);
  });

  it('counts a session finished after midnight towards the new day', () => {
    const { result } = renderHook(() => useSessionCounter());
    act(() => result.current.recordCompleted());

    vi.setSystemTime(new Date(2026, 8, 25, 0, 10));
    act(() => result.current.recordCompleted());
    expect(result.current.completedToday).toBe(1);
  });
});
