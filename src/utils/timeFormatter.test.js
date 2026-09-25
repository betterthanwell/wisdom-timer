// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatClockTime, formatTime } from './timeFormatter';

describe('formatTime', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(2700)).toBe('45:00');
    expect(formatTime(5999)).toBe('99:59');
  });
});

describe('formatClockTime', () => {
  const quarterToEight = new Date(2026, 8, 24, 7, 45, 30).getTime();

  it('shows hours and minutes in 24-hour locales', () => {
    expect(formatClockTime(quarterToEight, 'nb-NO')).toBe('07:45');
    expect(formatClockTime(new Date(2026, 8, 24, 19, 5).getTime(), 'en-GB')).toBe('19:05');
  });

  it('shows hours and minutes in 12-hour locales', () => {
    expect(formatClockTime(quarterToEight, 'en-US')).toMatch(/^07:45\sAM$/);
  });
});
