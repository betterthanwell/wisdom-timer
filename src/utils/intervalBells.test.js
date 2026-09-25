// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { countIntervalBellsDue } from './intervalBells';

// Elapsed seconds at which the count goes up, i.e. when a bell rings
const bellTimes = (duration, interval, firstAt) => {
  const times = [];
  for (let elapsed = 1; elapsed <= duration; elapsed++) {
    if (countIntervalBellsDue(elapsed, interval, duration, firstAt) > countIntervalBellsDue(elapsed - 1, interval, duration, firstAt)) {
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

  describe('with a separate first bell time', () => {
    it('rings first at firstAt, then every interval', () => {
      // 45 min session, first at 5 min, then every 10 min
      expect(bellTimes(2700, 600, 300)).toEqual([300, 900, 1500, 2100]);
    });

    it('can ring the first bell later than one interval', () => {
      // 30 min session, first at 20 min, then every 5 min
      expect(bellTimes(1800, 300, 1200)).toEqual([1200, 1500]);
    });

    it('still never rings at the very end', () => {
      expect(bellTimes(900, 600, 300)).toEqual([300]);
      expect(countIntervalBellsDue(900, 600, 900, 300)).toBe(1);
    });

    it('rings no bells when the first bell would be at or after the end', () => {
      expect(bellTimes(600, 300, 600)).toEqual([]);
      expect(bellTimes(600, 300, 900)).toEqual([]);
    });

    it('catches up once over skipped bells', () => {
      expect(countIntervalBellsDue(299, 600, 2700, 300)).toBe(0);
      expect(countIntervalBellsDue(1000, 600, 2700, 300)).toBe(2);
    });

    it('defaults to one interval when no first bell time is given', () => {
      expect(bellTimes(1200, 300, undefined)).toEqual([300, 600, 900]);
    });
  });
});
