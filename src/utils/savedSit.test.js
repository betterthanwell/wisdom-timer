import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSit, loadSit, resumeSit, saveSit } from './savedSit';

describe('saved sit', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('keeps a sit for this tab, until cleared', () => {
    expect(loadSit()).toBe(null);
    saveSit({ mode: 'timed', duration: 2700, endsAt: 1_000_000 });
    expect(loadSit()).toEqual({ mode: 'timed', duration: 2700, endsAt: 1_000_000 });

    clearSit();
    expect(loadSit()).toBe(null);
  });

  it('ignores anything that is not a saved sit', () => {
    for (const saved of ['nonsense', '{}', '{"mode":"timed","duration":60}', '{"mode":"x","duration":60,"remaining":30}', 'null']) {
      sessionStorage.setItem('wisdomTimerSit', saved);
      expect(loadSit()).toBe(null);
    }
  });

  it('carries on without storage (private browsing, blocked storage)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => saveSit({ mode: 'timed', duration: 60, remaining: 30 })).not.toThrow();
    expect(loadSit()).toBe(null);
  });
});

describe('resumeSit', () => {
  const now = 1_000_000;

  it('a running sit runs on to the same end', () => {
    expect(resumeSit({ mode: 'timed', duration: 600, endsAt: now + 90_500 }, now)).toEqual({ running: true, remainingMs: 90_500 });
  });

  it('a running sit whose end has passed has ended, at that time', () => {
    expect(resumeSit({ mode: 'timed', duration: 600, endsAt: now - 1 }, now)).toEqual({ endedAt: now - 1 });
    expect(resumeSit({ mode: 'timed', duration: 600, endsAt: now }, now)).toEqual({ endedAt: now });
  });

  it('with ?speed, the real time left runs that much faster (the end is kept in real time)', () => {
    // 90 real seconds left at speed 60: an hour and a half of session time
    expect(resumeSit({ mode: 'timed', duration: 7200, endsAt: now + 90_000 }, now, 60)).toEqual({ running: true, remainingMs: 5_400_000 });
    expect(resumeSit({ mode: 'timed', duration: 7200, endsAt: now - 1 }, now, 60)).toEqual({ endedAt: now - 1 });
  });

  it('a paused sit stays paused with the same time left', () => {
    expect(resumeSit({ mode: 'timed', duration: 600, remaining: 125 }, now)).toEqual({ running: false, remainingMs: 125_000 });
  });
});
