import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { audioManager } from './utils/audioManager';
import { button, click, startBellCount, renderApp, completeOneSecondSession, setUpAppTests } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// Settling in, bell patterns, gentle ending (the App tests are split across App.*.test.jsx)
describe('App', () => {
  setUpAppTests();

  describe('settling in before the start bell', () => {
    // Fake clock that still moves on its own, so sound loading completes
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // The ambient sound starts after the countdown, from a timer: iOS only
    // allows that for an <audio> element already started in a tap
    it('primes the chosen ambient sound during the tap that begins settling in', async () => {
      await renderApp();
      click('Rain');
      click('Settle in for 10s');
      click('Start');

      expect(audioManager.primeAmbient).toHaveBeenCalledWith('rain');
      expect(audioManager.playAmbient).not.toHaveBeenCalled();
    });

    it('does not prime without an ambient sound, or when starting straight away', async () => {
      await renderApp();
      click('Settle in for 10s');
      click('Start');
      click('Cancel');
      click('No settling in');
      click('Rain');
      click('Start');

      expect(audioManager.primeAmbient).not.toHaveBeenCalled();
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

    it('shows the next session number while settling in after a completed one', async () => {
      await renderApp();
      completeOneSecondSession();
      click('Settle in for 10s');
      click('Start');

      expect(screen.getByText('Settling in…')).toBeTruthy();
      expect(screen.getByText('Session 2')).toBeTruthy();
    });

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
    const strikesSwitch = () => screen.getByRole('switch', { name: 'Show bell strikes' });

    // Bell strike choices live behind the show switch
    const showStrikes = () => fireEvent.click(strikesSwitch());

    it('rings each bell once by default', async () => {
      await renderApp();
      click('Start');
      expect(audioManager.playBell).toHaveBeenCalledWith('start', 1);
    });

    it('offers the bell strikes section even with interval bells off, choices tucked away', async () => {
      await renderApp();
      expect(screen.getByRole('switch', { name: 'Interval woodblock' }).getAttribute('aria-checked')).toBe('false');
      expect(screen.getByText('Bell strikes')).toBeTruthy();
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
      fireEvent.click(strikesSwitch()); // choices tucked away
      click('Start');

      expect(audioManager.playBell).toHaveBeenCalledWith('start', 2);
    });

    it('uses the chosen end bell pattern when a session completes', async () => {
      await renderApp();
      showStrikes();
      click('End bell: 2 strikes');
      completeOneSecondSession();

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

    const startFiveMinutes = async ({ gentle = true } = {}) => {
      await renderApp();
      if (!gentle) fireEvent.click(screen.getByRole('switch', { name: 'Gentle ending' }));
      fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '5' } });
      click('Start');
    };

    it('is on by default', async () => {
      await renderApp();
      expect(screen.getByRole('switch', { name: 'Gentle ending' }).getAttribute('aria-checked')).toBe('true');
    });

    it('fades the ambient sound out over the last minute', async () => {
      await startFiveMinutes();
      passSeconds(200); // 1:40 left
      expect(lastLevel()).toBe(1);

      passSeconds(70); // 0:30 left
      expect(lastLevel()).toBe(0.5);

      passSeconds(29); // 0:01 left
      expect(lastLevel()).toBeCloseTo(1 / 60);
    });

    it('when turned off, the ambient sound stays at full level', async () => {
      await startFiveMinutes({ gentle: false });
      click('Show settings');
      expect(screen.getByRole('switch', { name: 'Gentle ending' }).getAttribute('aria-checked')).toBe('false');
      passSeconds(270);
      expect(lastLevel()).toBe(1);
    });

    it('goes back to full level when reset', async () => {
      await startFiveMinutes();
      passSeconds(270);
      click('Show settings');
      click('Reset');
      expect(lastLevel()).toBe(1);
    });

    it('remembers the choice', async () => {
      await startFiveMinutes({ gentle: false });
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).gentleEnding).toBe(false);
    });
  });
});
