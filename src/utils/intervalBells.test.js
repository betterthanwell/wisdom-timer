import { describe, expect, it } from 'vitest';
import { countIntervalBellsDue } from './intervalBells';

// Elapsed seconds at which the count goes up, i.e. when a bell rings
const bellTimes = (duration, interval) => {
  const times = [];
  for (let elapsed = 1; elapsed <= duration; elapsed++) {
    if (countIntervalBellsDue(elapsed, interval, duration) > countIntervalBellsDue(elapsed - 1, interval, duration)) {
      times.push(elapsed);
    }
  }
  return times;
};

describe('countIntervalBellsDue', () => {
  it('rings every interval during a session', () => {
    // 45 min session, bells every 5 min
    expect(bellTimes(2700, 300)).toEqual([300, 600, 900, 1200, 1500, 1800, 2100, 2400]);
  });

  it('does not ring an interval bell at the very end (the end bell covers that)', () => {
    expect(countIntervalBellsDue(2700, 300, 2700)).toBe(8);
    expect(bellTimes(600, 300)).toEqual([300]);
  });

  it('handles intervals that do not divide the duration evenly', () => {
    // 7 min session, bells every 3 min
    expect(bellTimes(420, 180)).toEqual([180, 360]);
  });

  it('rings no bells when the interval is as long as or longer than the session', () => {
    expect(bellTimes(300, 300)).toEqual([]);
    expect(bellTimes(300, 600)).toEqual([]);
  });

  it('rings no bells before the session starts', () => {
    expect(countIntervalBellsDue(0, 300, 2700)).toBe(0);
  });

  it('catches up when ticks are skipped (e.g. a throttled background tab)', () => {
    // Jumping from 4:59 straight to 10:30 should count both the 5 and 10 min bells
    expect(countIntervalBellsDue(299, 300, 2700)).toBe(0);
    expect(countIntervalBellsDue(630, 300, 2700)).toBe(2);
  });

  it('treats a missing or invalid interval as no bells', () => {
    expect(countIntervalBellsDue(600, undefined, 2700)).toBe(0);
    expect(countIntervalBellsDue(600, 0, 2700)).toBe(0);
    expect(countIntervalBellsDue(600, -60, 2700)).toBe(0);
  });

  it('handles a zero-length session', () => {
    expect(countIntervalBellsDue(10, 300, 0)).toBe(0);
  });
});
