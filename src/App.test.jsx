import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { audioManager } from './utils/audioManager';

// Replace real audio with spies: these tests check what the app asks for
vi.mock('./utils/audioManager', () => ({
  audioManager: {
    init: vi.fn(async () => true),
    cleanup: vi.fn(),
    playBell: vi.fn(async () => {}),
    playAmbient: vi.fn(async () => {}),
    pauseAmbient: vi.fn(),
    resumeAmbient: vi.fn(),
    stopAmbient: vi.fn(async () => {}),
    setBellVolume: vi.fn(),
    setAmbientVolume: vi.fn(),
  },
}));

const button = (name) => screen.getByRole('button', { name });
const click = (name) => fireEvent.click(button(name));
const startBellCount = () => audioManager.playBell.mock.calls.filter(([type]) => type === 'start').length;

const renderApp = async () => {
  render(<App />);
  // Controls unlock once audio has initialised
  await waitFor(() => expect(button('Start').disabled).toBe(false));
};

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('starting and resuming', () => {
    it('rings the start bell and starts the chosen ambient sound', async () => {
      await renderApp();
      click('Rain');
      click('Start');

      expect(startBellCount()).toBe(1);
      expect(audioManager.playAmbient).toHaveBeenCalledWith('rain');
      expect(screen.getByText('Meditating...')).toBeTruthy();
    });

    it('pauses the ambient sound and shows Paused', async () => {
      await renderApp();
      click('Start');
      click('Pause');

      expect(audioManager.pauseAmbient).toHaveBeenCalled();
      expect(screen.getByText('Paused')).toBeTruthy();
    });

    it('rings the start bell again on resume, and resumes the same sound', async () => {
      await renderApp();
      click('Rain');
      click('Start');
      click('Pause');
      click('Start');

      expect(startBellCount()).toBe(2);
      // audioManager resumes (rather than restarts) a sound that is already current
      expect(audioManager.playAmbient.mock.calls).toEqual([['rain'], ['rain']]);
    });
  });

  describe('after a session completes', () => {
    // A real 1-second session keeps these tests quick
    const completeOneSecondSession = async () => {
      fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('Seconds'), { target: { value: '1' } });
      click('Start');
      await screen.findByText('Complete', {}, { timeout: 3000 });
    };

    it('rings the end bell and stops the ambient sound', async () => {
      await renderApp();
      click('Rain');
      await completeOneSecondSession();

      expect(audioManager.playBell).toHaveBeenCalledWith('end');
      expect(audioManager.stopAmbient).toHaveBeenCalled();
    });

    it('starts a new session with Play, without needing Reset', async () => {
      await renderApp();
      click('Rain');
      await completeOneSecondSession();
      vi.clearAllMocks();

      expect(button('Start').disabled).toBe(false);
      click('Start');

      expect(screen.getByText('Meditating...')).toBeTruthy();
      expect(screen.getByText('00:01')).toBeTruthy();
      expect(startBellCount()).toBe(1);
      expect(audioManager.playAmbient).toHaveBeenCalledWith('rain');
    });

    it('counts sessions: Session 1, then Session 2 after completing one', async () => {
      await renderApp();
      expect(screen.getByText('Session 1')).toBeTruthy();

      await completeOneSecondSession();
      expect(screen.getByText('Session 1')).toBeTruthy(); // the one just completed

      click('Start');
      expect(screen.getByText('Session 2')).toBeTruthy();
    });

    it('does not count a session that was reset before finishing', async () => {
      await renderApp();
      click('Start');
      click('Reset');
      expect(screen.getByText('Session 1')).toBeTruthy();
    });
  });

  describe('while paused', () => {
    beforeEach(async () => {
      await renderApp();
      click('Rain');
      click('Start');
      click('Pause');
      vi.clearAllMocks();
    });

    it('locks the duration settings', () => {
      expect(button('30m').disabled).toBe(true);
      expect(button('60m').disabled).toBe(true);
      expect(screen.getByLabelText('Minutes').disabled).toBe(true);
      expect(screen.getByLabelText('Seconds').disabled).toBe(true);
    });

    it('unlocks the duration settings after reset', () => {
      click('Reset');
      expect(button('30m').disabled).toBe(false);
      expect(screen.getByLabelText('Minutes').disabled).toBe(false);
    });

    it('keeps the volume sliders usable', () => {
      const [bellSlider, ambientSlider] = screen.getAllByRole('slider');
      expect(bellSlider.disabled).toBe(false);
      expect(ambientSlider.disabled).toBe(false);

      fireEvent.change(bellSlider, { target: { value: '30' } });
      expect(audioManager.setBellVolume).toHaveBeenCalledWith(0.3);
    });

    it('stops the ambient sound when None is chosen, and resumes silently', () => {
      click('None');
      expect(audioManager.stopAmbient).toHaveBeenCalled();

      click('Start');
      expect(audioManager.playAmbient).not.toHaveBeenCalled();
      expect(startBellCount()).toBe(1);
    });

    it('plays a newly chosen sound on resume, not straight away', () => {
      click('Forest');
      expect(audioManager.playAmbient).not.toHaveBeenCalled();

      click('Start');
      expect(audioManager.playAmbient).toHaveBeenCalledWith('forest');
    });
  });

  describe('while running', () => {
    it('switches the ambient sound right away', async () => {
      await renderApp();
      click('Rain');
      click('Start');
      vi.clearAllMocks();

      click('Ocean Waves');
      expect(audioManager.playAmbient).toHaveBeenCalledWith('ocean');

      click('None');
      expect(audioManager.stopAmbient).toHaveBeenCalled();
    });

    it('locks the duration settings', async () => {
      await renderApp();
      click('Start');
      expect(button('30m').disabled).toBe(true);
      expect(screen.getByLabelText('Minutes').disabled).toBe(true);
    });
  });

  describe('keep screen awake', () => {
    let wakeLock;

    beforeEach(() => {
      wakeLock = {
        request: vi.fn(async () => ({ released: false, release: vi.fn(async () => {}) })),
      };
      Object.defineProperty(navigator, 'wakeLock', { value: wakeLock, configurable: true });
    });

    afterEach(() => {
      delete navigator.wakeLock;
    });

    const keepAwakeSwitch = () => screen.getByRole('switch', { name: 'Keep screen awake' });

    it('is on by default, and keeps the screen awake while running', async () => {
      await renderApp();
      expect(keepAwakeSwitch().getAttribute('aria-checked')).toBe('true');
      expect(wakeLock.request).not.toHaveBeenCalled();

      click('Start');
      await waitFor(() => expect(wakeLock.request).toHaveBeenCalledWith('screen'));
    });

    it('lets the screen sleep again when paused', async () => {
      await renderApp();
      click('Start');
      await waitFor(() => expect(wakeLock.request).toHaveBeenCalled());
      const lock = await wakeLock.request.mock.results[0].value;

      click('Pause');
      await waitFor(() => expect(lock.release).toHaveBeenCalled());
    });

    it('does nothing when turned off, and remembers that', async () => {
      await renderApp();
      fireEvent.click(keepAwakeSwitch());
      click('Start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(wakeLock.request).not.toHaveBeenCalled();

      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).keepScreenAwake).toBe(false);
    });
  });

  it('hides the keep-awake setting where the browser does not support it', async () => {
    await renderApp();
    expect(screen.queryByRole('switch', { name: 'Keep screen awake' })).toBe(null);
  });

  describe('keyboard shortcuts', () => {
    it('toggles with Space and resets with R', async () => {
      await renderApp();

      fireEvent.keyDown(window, { code: 'Space', key: ' ' });
      expect(screen.getByText('Meditating...')).toBeTruthy();

      fireEvent.keyDown(window, { code: 'Space', key: ' ' });
      expect(screen.getByText('Paused')).toBeTruthy();

      fireEvent.keyDown(window, { code: 'KeyR', key: 'r' });
      expect(screen.getByText('Ready')).toBeTruthy();
    });

    it.each([
      ['Cmd+R', { metaKey: true }],
      ['Ctrl+R', { ctrlKey: true }],
    ])('leaves %s to the browser (reload)', async (_name, modifier) => {
      await renderApp();
      click('Start');

      const event = new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true, cancelable: true, ...modifier });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(screen.getByText('Meditating...')).toBeTruthy();
    });
  });

  describe('settings validation', () => {
    it('shows that sounds are loading, with Start disabled until they are ready', async () => {
      audioManager.init.mockImplementationOnce(() => new Promise(() => {}));
      render(<App />);

      expect(screen.getByText('Loading sounds…')).toBeTruthy();
      expect(button('Start').disabled).toBe(true);
    });

    it('hides the loading notice once sounds are ready', async () => {
      await renderApp();
      expect(screen.queryByText('Loading sounds…')).toBe(null);
    });

    it('ignores invalid saved settings', async () => {
      localStorage.setItem('wisdomTimerSettings', JSON.stringify({
        duration: 0,
        selectedAmbient: 'wind',
        bellVolume: 7,
      }));
      await renderApp();

      expect(screen.getByText('45:00')).toBeTruthy(); // default duration
      expect(button('None').className).toContain('bg-white/20'); // selected
      expect(screen.getAllByRole('slider')[0].value).toBe('70'); // default bell volume
    });

    it('cannot start a 0:00 session', async () => {
      await renderApp();
      fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('Seconds'), { target: { value: '0' } });

      expect(button('Start').disabled).toBe(true);
    });

    it('caps the interval at 30 minutes', async () => {
      await renderApp();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval bells' }));
      const interval = screen.getByLabelText('Interval in minutes');

      fireEvent.change(interval, { target: { value: '99' } });
      expect(interval.value).toBe('30');
    });
  });
});
