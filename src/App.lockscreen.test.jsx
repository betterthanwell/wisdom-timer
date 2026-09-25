import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { audioManager } from './utils/audioManager';
import { click, renderApp, setUpAppTests, startBellCount } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// The lock screen's play/pause (iOS shows them while the ambient sound or a
// guided voice plays), through the Media Session API - which jsdom lacks
const fakeMediaSession = () => {
  const handlers = {};
  return {
    handlers,
    metadata: null,
    playbackState: 'none',
    setActionHandler: vi.fn((action, handler) => {
      if (handler) handlers[action] = handler;
      else delete handlers[action];
    }),
  };
};

describe('App on the lock screen', () => {
  setUpAppTests();
  let session;
  const press = (action) => act(() => session.handlers[action]?.({ action }));

  beforeEach(() => {
    session = fakeMediaSession();
    Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true });
    vi.stubGlobal('MediaMetadata', class {
      constructor(init) {
        Object.assign(this, init);
      }
    });
  });

  afterEach(() => {
    delete navigator.mediaSession;
    vi.unstubAllGlobals();
  });

  it('pauses the whole session, clock and sound, like the Pause button', async () => {
    await renderApp();
    click('Rain');
    click('Start');
    press('pause');

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(audioManager.pauseAmbient).toHaveBeenCalled();
    expect(session.playbackState).toBe('paused');
  });

  it('resumes a paused session, like the Start button', async () => {
    await renderApp();
    click('Start');
    press('pause');
    press('play');

    expect(screen.getByText('Meditating...')).toBeTruthy();
    expect(audioManager.unlock).toHaveBeenCalledTimes(2);
    expect(startBellCount()).toBe(2);
    expect(session.playbackState).toBe('playing');
  });

  it('does not start a new session', async () => {
    await renderApp();
    press('play');

    expect(screen.getByText('Ready')).toBeTruthy();
    expect(startBellCount()).toBe(0);
  });

  it('cancels settling in, like Space', async () => {
    await renderApp();
    click('Settle in for 5s');
    click('Start');
    press('pause');

    expect(screen.getByText('Ready')).toBeTruthy();
  });

  it('shows what is happening, and nothing once the session is over', async () => {
    await renderApp();
    expect(session.playbackState).toBe('none');
    expect(session.metadata).toBe(null);

    click('Start');
    expect(session.metadata.title).toBe('Meditating');
    expect(session.metadata.artist).toBe('Wisdom Timer');

    click('Pause');
    expect(session.metadata.title).toBe('Paused');

    click('Reset');
    expect(session.playbackState).toBe('none');
    expect(session.metadata).toBe(null);
  });
});
