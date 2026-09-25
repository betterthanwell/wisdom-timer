import { describe, expect, it, vi } from 'vitest';
import { createDebugLog } from './debugLog';

describe('debug log', () => {
  it('keeps the latest 50 messages and tells listeners', () => {
    const log = createDebugLog(true);
    const listener = vi.fn();
    log.subscribe(listener);
    for (let i = 1; i <= 60; i++) log.add(`message ${i}`);

    expect(log.entries()).toHaveLength(50);
    expect(log.entries().at(-1).message).toBe('message 60');
    expect(listener).toHaveBeenCalledTimes(60);
  });

  it('keeps nothing when the debug panel is off', () => {
    const log = createDebugLog(false);
    log.add('ignored');
    expect(log.entries()).toEqual([]);
  });
});
