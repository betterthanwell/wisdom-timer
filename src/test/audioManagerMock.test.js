// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AudioManager } from '../utils/audioManager';
import { audioManager as mock } from './audioManagerMock';

// The App tests run against this mock instead of the real audioManager: a
// method only the mock has (renamed or removed in AudioManager) would let
// them pass while the app breaks
describe('audioManagerMock', () => {
  it('only stands in for methods the real AudioManager has', () => {
    const mocked = Object.keys(mock).filter((key) => typeof mock[key] === 'function');
    expect(mocked.length).toBeGreaterThan(0);
    expect(mocked.filter((key) => typeof AudioManager.prototype[key] !== 'function')).toEqual([]);
  });
});
