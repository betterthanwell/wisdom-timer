import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { audioManager } from './utils/audioManager';

// Replace real audio with spies: these tests check what the app asks for
vi.mock('./utils/audioManager', () => ({
  audioManager: {
    init: vi.fn(async () => true),
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

      expect(audioManager.playBell).toHaveBeenCalledWith('end', 1);
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

  describe('end time', () => {
    it('shows when the session will end while running, but not when paused or stopped', async () => {
      await renderApp();
      expect(screen.queryByText(/^Ends at /)).toBe(null);

      click('Start');
      expect(screen.getByText(/^Ends at \d{2}:\d{2}/)).toBeTruthy();

      click('Pause');
      expect(screen.queryByText(/^Ends at /)).toBe(null);

      click('Start');
      click('Reset');
      expect(screen.queryByText(/^Ends at /)).toBe(null);
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

      click('Show settings');
      click('Ocean Waves');
      expect(audioManager.playAmbient).toHaveBeenCalledWith('ocean');

      click('None');
      expect(audioManager.stopAmbient).toHaveBeenCalled();
    });

    it('locks the duration settings', async () => {
      await renderApp();
      click('Start');
      click('Show settings');
      expect(button('30m').disabled).toBe(true);
      expect(screen.getByLabelText('Minutes').disabled).toBe(true);
    });
  });

  describe('settling in before the start bell', () => {
    // Fake clock that still moves on its own, so sound loading completes
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const passSeconds = (seconds) =>
      act(() => {
        vi.advanceTimersByTime(seconds * 1000);
      });

    const renderWithSettling = async (label = 'Settle in for 10s') => {
      await renderApp();
      click(label);
      vi.clearAllMocks();
    };

    it('is off by default: Start starts straight away', async () => {
      await renderApp();
      expect(button('No settling in').getAttribute('aria-pressed')).toBe('true');
      click('Start');
      expect(screen.getByText('Meditating...')).toBeTruthy();
    });

    it('counts down in silence, then rings the start bell and starts', async () => {
      await renderWithSettling();
      click('Rain');
      vi.clearAllMocks();
      click('Start');

      expect(screen.getByText('Settling in…')).toBeTruthy();
      expect(screen.getByText('00:10')).toBeTruthy();
      expect(startBellCount()).toBe(0);
      expect(audioManager.playAmbient).not.toHaveBeenCalled();

      passSeconds(10);
      expect(screen.getByText('Meditating...')).toBeTruthy();
      expect(screen.getByText('45:00')).toBeTruthy();
      expect(startBellCount()).toBe(1);
      expect(audioManager.playAmbient).toHaveBeenCalledWith('rain');
    });

    it('can be cancelled with Cancel, Space or Reset, without any sound', async () => {
      await renderWithSettling();
      for (const cancel of [
        () => click('Cancel'),
        () => fireEvent.keyDown(window, { code: 'Space', key: ' ' }),
        () => click('Reset'),
      ]) {
        click('Start');
        expect(screen.getByText('Settling in…')).toBeTruthy();
        cancel();
        expect(screen.getByText('Ready')).toBeTruthy();
      }

      passSeconds(20);
      expect(screen.getByText('Ready')).toBeTruthy();
      expect(audioManager.playBell).not.toHaveBeenCalled();
    });

    it('does not settle again when resuming after a pause', async () => {
      await renderWithSettling();
      click('Start');
      passSeconds(10);
      click('Pause');

      click('Start');
      expect(screen.getByText('Meditating...')).toBeTruthy();
    });

    it('locks the duration and keeps the screen quiet while settling', async () => {
      await renderWithSettling();
      click('Start');
      expect(screen.queryByRole('heading', { name: 'Settings' })).toBe(null);

      click('Show settings');
      expect(button('30m').disabled).toBe(true);
    });

    it('uses an ambient sound chosen while settling', async () => {
      await renderWithSettling();
      click('Start');
      click('Show settings');
      click('Forest');

      passSeconds(10);
      expect(audioManager.playAmbient).toHaveBeenCalledWith('forest');
    });

    it('remembers the choice', async () => {
      await renderWithSettling('Settle in for 1m');
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).settleSeconds).toBe(60);
    });
  });

  describe('bell patterns', () => {
    const intervalSwitch = () => screen.getByRole('switch', { name: 'Interval bells' });
    const strikesSwitch = () => screen.queryByRole('switch', { name: 'Show bell strikes' });

    // Bell strike choices live behind interval bells + the show switch
    const showStrikes = () => {
      fireEvent.click(intervalSwitch());
      fireEvent.click(strikesSwitch());
    };

    it('rings each bell once by default', async () => {
      await renderApp();
      click('Start');
      expect(audioManager.playBell).toHaveBeenCalledWith('start', 1);
    });

    it('hides the whole bell strikes section while interval bells are off', async () => {
      await renderApp();
      expect(strikesSwitch()).toBe(null);
      expect(screen.queryByText('Bell strikes')).toBe(null);
      expect(screen.queryByRole('button', { name: 'Start bell: 1 strike' })).toBe(null);
    });

    it('shows the section with interval bells on, but keeps the choices tucked away by default', async () => {
      await renderApp();
      fireEvent.click(intervalSwitch());

      expect(strikesSwitch().getAttribute('aria-checked')).toBe('false');
      expect(screen.queryByRole('button', { name: 'Start bell: 1 strike' })).toBe(null);
    });

    it('shows the choices with the switch, and remembers that', async () => {
      await renderApp();
      showStrikes();

      expect(button('End bell: 1 strike').getAttribute('aria-pressed')).toBe('true');
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).showBellStrikes).toBe(true);

      fireEvent.click(strikesSwitch());
      expect(screen.queryByRole('button', { name: 'End bell: 1 strike' })).toBe(null);
    });

    it('rings the start bell as many times as chosen, and remembers it', async () => {
      await renderApp();
      showStrikes();
      click('Start bell: 3 strikes');
      click('Start');

      expect(audioManager.playBell).toHaveBeenCalledWith('start', 3);
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).startStrikes).toBe(3);
    });

    it('keeps using chosen strikes after the section is hidden', async () => {
      await renderApp();
      showStrikes();
      click('Start bell: 2 strikes');
      fireEvent.click(intervalSwitch()); // interval bells off: section gone
      click('Start');

      expect(audioManager.playBell).toHaveBeenCalledWith('start', 2);
    });

    it('uses the chosen end bell pattern when a session completes', async () => {
      await renderApp();
      showStrikes();
      click('End bell: 2 strikes');
      fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('Seconds'), { target: { value: '1' } });
      click('Start');
      await screen.findByText('Complete', {}, { timeout: 3000 });

      expect(audioManager.playBell).toHaveBeenCalledWith('end', 2);
    });

    it('cancels strikes that have not rung yet on reset', async () => {
      await renderApp();
      click('Start');
      click('Reset');
      expect(audioManager.cancelPendingBells).toHaveBeenCalled();
    });
  });

  describe('gentle ending', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const passSeconds = (seconds) => {
      for (let i = 0; i < seconds; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
    };
    const lastLevel = () => audioManager.setAmbientLevel.mock.calls.at(-1)?.[0];

    const startFiveMinutes = async (gentle) => {
      await renderApp();
      if (gentle) fireEvent.click(screen.getByRole('switch', { name: 'Gentle ending' }));
      fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '5' } });
      click('Start');
    };

    it('is off by default: the ambient sound stays at full level', async () => {
      await startFiveMinutes(false);
      click('Show settings');
      expect(screen.getByRole('switch', { name: 'Gentle ending' }).getAttribute('aria-checked')).toBe('false');
      passSeconds(270);
      expect(lastLevel()).toBe(1);
    });

    it('fades the ambient sound out over the last minute', async () => {
      await startFiveMinutes(true);
      passSeconds(200); // 1:40 left
      expect(lastLevel()).toBe(1);

      passSeconds(70); // 0:30 left
      expect(lastLevel()).toBe(0.5);

      passSeconds(29); // 0:01 left
      expect(lastLevel()).toBeCloseTo(1 / 60);
    });

    it('goes back to full level when reset', async () => {
      await startFiveMinutes(true);
      passSeconds(270);
      click('Show settings');
      click('Reset');
      expect(lastLevel()).toBe(1);
    });

    it('remembers the choice', async () => {
      await startFiveMinutes(true);
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).gentleEnding).toBe(true);
    });
  });

  describe('open-ended sitting', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const passSeconds = (seconds) => {
      for (let i = 0; i < seconds; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
    };
    const openEndedSwitch = () => screen.getByRole('switch', { name: 'Open-ended sitting' });

    const startOpenEnded = async () => {
      await renderApp();
      fireEvent.click(openEndedSwitch());
      vi.clearAllMocks();
    };

    it('is off by default', async () => {
      await renderApp();
      expect(openEndedSwitch().getAttribute('aria-checked')).toBe('false');
      expect(screen.queryByRole('button', { name: 'Finish' })).toBe(null);
    });

    it('greys out the duration settings and starts from 00:00', async () => {
      await startOpenEnded();
      expect(button('45m').disabled).toBe(true);
      expect(screen.getByLabelText('Minutes').disabled).toBe(true);
      expect(screen.getByText('00:00')).toBeTruthy();
      expect(screen.getByText('Counts up until you press Finish.')).toBeTruthy();
    });

    it('counts up, with no end time', async () => {
      await startOpenEnded();
      click('Start');
      passSeconds(75);

      expect(screen.getByText('01:15')).toBeTruthy();
      expect(screen.queryByText(/^Ends at /)).toBe(null);
    });

    it('keeps ringing interval bells', async () => {
      await startOpenEnded();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval bells' }));
      fireEvent.change(screen.getByLabelText('Interval in minutes'), { target: { value: '1' } });
      click('Start');
      passSeconds(180);

      const intervalBells = audioManager.playBell.mock.calls.filter(([type]) => type === 'interval');
      expect(intervalBells).toHaveLength(3);
    });

    it('Finish rings the end bell, completes the session and keeps the time sat', async () => {
      await startOpenEnded();
      click('Rain');
      click('Start');
      passSeconds(90);

      click('Finish');
      expect(audioManager.playBell).toHaveBeenCalledWith('end', 1);
      expect(audioManager.stopAmbient).toHaveBeenCalled();
      expect(screen.getByText('Complete')).toBeTruthy();
      expect(screen.getByText('01:30')).toBeTruthy();
      expect(screen.getByText('Session 1')).toBeTruthy();

      click('Start');
      expect(screen.getByText('00:00')).toBeTruthy();
      expect(screen.getByText('Session 2')).toBeTruthy();
    });

    it('can also finish while paused', async () => {
      await startOpenEnded();
      click('Start');
      passSeconds(30);
      click('Pause');
      click('Finish');
      expect(screen.getByText('Complete')).toBeTruthy();
    });

    it('goes back to the chosen duration when turned off, and remembers the choice', async () => {
      await startOpenEnded();
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).openEnded).toBe(true);

      fireEvent.click(openEndedSwitch());
      expect(screen.getByText('45:00')).toBeTruthy();
    });
  });

  describe('quiet screen while sitting', () => {
    const settingsVisible = () => screen.queryByRole('heading', { name: 'Settings' }) !== null;
    const dimmed = () => screen.getByTestId('quiet-dim').className.includes('opacity-100');

    it('hides the settings and keyboard hint, and dims the page, while running', async () => {
      await renderApp();
      expect(settingsVisible()).toBe(true);
      expect(dimmed()).toBe(false);

      click('Start');
      expect(settingsVisible()).toBe(false);
      expect(screen.queryByText(/Press space/)).toBe(null);
      expect(dimmed()).toBe(true);
    });

    it('brings the settings back on request, and hides them again', async () => {
      await renderApp();
      click('Start');

      click('Show settings');
      expect(settingsVisible()).toBe(true);
      expect(button('Hide settings').getAttribute('aria-expanded')).toBe('true');
      expect(dimmed()).toBe(false);

      click('Hide settings');
      expect(settingsVisible()).toBe(false);
      expect(dimmed()).toBe(true);
    });

    it('shows everything again when paused, and is quiet again on the next start', async () => {
      await renderApp();
      click('Start');
      click('Show settings');
      click('Pause');
      expect(settingsVisible()).toBe(true);
      expect(screen.queryByRole('button', { name: /settings$/ })).toBe(null);
      expect(dimmed()).toBe(false);

      click('Start');
      expect(settingsVisible()).toBe(false);
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
