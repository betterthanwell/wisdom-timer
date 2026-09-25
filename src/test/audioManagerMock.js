import { vi } from 'vitest';

// audioManager replaced by spies, for the App tests (see appTestUtils.jsx)
export const audioManager = {
  init: vi.fn(async () => true),
  unlock: vi.fn(),
  primeAmbient: vi.fn(),
  cleanup: vi.fn(),
  playBell: vi.fn(async () => {}),
  cancelPendingBells: vi.fn(),
  playAmbient: vi.fn(async () => {}),
  pauseAmbient: vi.fn(),
  resumeAmbient: vi.fn(),
  stopAmbient: vi.fn(async () => {}),
  setBellVolume: vi.fn(),
  setAmbientVolume: vi.fn(),
  setAmbientLevel: vi.fn(),
};
