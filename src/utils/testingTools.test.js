import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeSessionClock, readTestingTools } from './testingTools';

const at = (url) => new URL(url);

describe('readTestingTools', () => {
  it('reads ?speed and ?debug on previews and local development', () => {
    expect(readTestingTools(at('https://wisdom-timer-git-x.vercel.app/?speed=60&debug'))).toEqual({ speed: 60, debug: true });
    expect(readTestingTools(at('http://localhost:5173/?debug=1'))).toEqual({ speed: 1, debug: true });
  });

  it('is always off on the live site', () => {
    expect(readTestingTools(at('https://wisdomtimer.app/?speed=60&debug'))).toEqual({ speed: 1, debug: false });
    expect(readTestingTools(at('https://www.wisdomtimer.app/?speed=60&debug'))).toEqual({ speed: 1, debug: false });
  });

  it('ignores a speed that is not a number from 1 to 600', () => {
    for (const speed of ['0', '-5', 'fast', '601', '']) {
      expect(readTestingTools(at(`http://localhost:5173/?speed=${speed}`)).speed).toBe(1);
    }
  });
});

describe('makeSessionClock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is the real clock at normal speed', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const clock = makeSessionClock(1);
    vi.advanceTimersByTime(5000);
    expect(clock.now()).toBe(Date.now());
    expect(clock.realDelay(5000)).toBe(5000);
  });

  it('runs faster than real time at a higher speed', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const clock = makeSessionClock(60);
    const start = clock.now();
    vi.advanceTimersByTime(1000); // one real second
    expect(clock.now() - start).toBe(60_000); // one session minute
    expect(clock.realDelay(60_000)).toBe(1000);
  });
});
