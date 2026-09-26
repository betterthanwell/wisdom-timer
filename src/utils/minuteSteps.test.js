// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { minuteSteps } from './minuteSteps';

describe('minuteSteps', () => {
  it('goes 1 at a time up to 10, then 5 at a time', () => {
    expect(minuteSteps(30)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30]);
  });

  it('ends on the maximum even when it is off the 5s', () => {
    expect(minuteSteps(99).slice(-3)).toEqual([90, 95, 99]);
  });
});
