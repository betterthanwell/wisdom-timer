// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { gentleEndingLevel } from './gentleEnding';

describe('gentleEndingLevel', () => {
  it('is full volume until the last minute', () => {
    expect(gentleEndingLevel(2700, 2700)).toBe(1);
    expect(gentleEndingLevel(61, 2700)).toBe(1);
    expect(gentleEndingLevel(60, 2700)).toBe(1);
  });

  it('fades evenly to silence over the last minute', () => {
    expect(gentleEndingLevel(45, 2700)).toBe(0.75);
    expect(gentleEndingLevel(30, 2700)).toBe(0.5);
    expect(gentleEndingLevel(1, 2700)).toBeCloseTo(1 / 60);
    expect(gentleEndingLevel(0, 2700)).toBe(0);
  });

  it('fades over the last half of sessions shorter than two minutes', () => {
    expect(gentleEndingLevel(30, 30)).toBe(1);
    expect(gentleEndingLevel(15, 30)).toBe(1);
    expect(gentleEndingLevel(10, 30)).toBeCloseTo(10 / 15);
  });

  it('handles a zero-length session', () => {
    expect(gentleEndingLevel(0, 0)).toBe(0);
  });
});
