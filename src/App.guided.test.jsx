import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { audioManager } from './utils/audioManager';
import { button, click, renderApp, setUpAppTests, startBellCount } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// Guided meditation (the App tests are split across App.*.test.jsx). The
// metta recording lasts 248.576 s; with the 15 s lead-in a session is
// 263.576 s. (jsdom has no Cache Storage, so every recording counts as kept.)
describe('App', () => {
  setUpAppTests();

  describe('guided meditation', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const passMs = (ms) => {
      for (; ms > 0; ms -= 1000) {
        act(() => {
          vi.advanceTimersByTime(Math.min(ms, 1000));
        });
      }
    };
    const guidedSwitch = () => screen.getByRole('switch', { name: 'Guided meditation' });
    const endBellCount = () => audioManager.playBell.mock.calls.filter(([type]) => type === 'end').length;

    const startGuided = async () => {
      await renderApp();
      fireEvent.click(guidedSwitch());
      vi.clearAllMocks();
    };

    it('is off by default', async () => {
      await renderApp();
      expect(guidedSwitch().getAttribute('aria-checked')).toBe('false');
      expect(screen.queryByRole('button', { name: /^Metta/ })).toBe(null);
    });

    it('shows the recordings, with metta chosen, and hides the settings that do not apply', async () => {
      await startGuided();
      expect(button(/^Metta/).getAttribute('aria-pressed')).toBe('true');
      expect(button(/^Breath, short/)).toBeTruthy();
      expect(button(/^Breath, older/)).toBeTruthy();
      expect(button(/^Breath, with leaving/)).toBeTruthy();
      expect(screen.getByRole('link', { name: /Thanissaro Bhikkhu/ })).toBeTruthy();

      expect(screen.queryByRole('button', { name: '45m' })).toBe(null);
      expect(screen.queryByRole('switch', { name: 'Open-ended sitting' })).toBe(null);
      expect(screen.queryByRole('switch', { name: 'Interval woodblock' })).toBe(null);
      expect(screen.queryByRole('group', { name: 'Ambient sound' })).toBe(null);
      // The lead-in plus the recording, rounded up: 263.576 s
      expect(screen.getByText('04:24')).toBeTruthy();
    });

    it('takes its length from the chosen recording', async () => {
      await startGuided();
      click(/^Breath, short/);
      // 15 + 736.311 s
      expect(screen.getByText('12:32')).toBeTruthy();
      expect(button(/^Breath, short/).getAttribute('aria-pressed')).toBe('true');
    });

    it('rings the start bell, starts the voice after the lead-in, and the end bell exactly when it finishes', async () => {
      await startGuided();
      click('Start');
      expect(startBellCount()).toBe(1);
      expect(audioManager.primeAmbient).toHaveBeenCalledWith('metta');

      passMs(14_999);
      expect(audioManager.playAmbient).not.toHaveBeenCalled();
      passMs(1);
      expect(audioManager.playAmbient).toHaveBeenCalledWith('metta', 0);

      passMs(248_575);
      expect(endBellCount()).toBe(0);
      passMs(1);
      expect(endBellCount()).toBe(1);
      expect(audioManager.stopAmbient).toHaveBeenCalled();
      expect(screen.getByText('Complete')).toBeTruthy();
    });

    it('resumes the voice exactly where the session is, without the start bell', async () => {
      await startGuided();
      click('Start');
      passMs(20_250);
      click('Pause');
      expect(audioManager.pauseAmbient).toHaveBeenCalled();
      passMs(10_000);

      click('Start');
      expect(startBellCount()).toBe(1);
      expect(audioManager.playAmbient).toHaveBeenLastCalledWith('metta', 5.25);
    });

    it('holds the lead-in over a pause', async () => {
      await startGuided();
      click('Start');
      passMs(10_000);
      click('Pause');
      passMs(30_000);
      expect(audioManager.playAmbient).not.toHaveBeenCalled();

      click('Start');
      passMs(4_999);
      expect(audioManager.playAmbient).not.toHaveBeenCalled();
      passMs(1);
      expect(audioManager.playAmbient).toHaveBeenCalledWith('metta', 0);
    });

    it('does not start the voice after Reset during the lead-in', async () => {
      await startGuided();
      click('Start');
      passMs(5_000);
      click('Reset');
      passMs(20_000);
      expect(audioManager.playAmbient).not.toHaveBeenCalled();
    });

    it('plays no ambient sound, woodblock or settling in, even when they are chosen', async () => {
      localStorage.setItem(
        'wisdomTimerSettings',
        JSON.stringify({ selectedAmbient: 'rain', intervalBellsEnabled: true, intervalStart: 60, settleSeconds: 10 })
      );
      await startGuided();
      click('Start');
      // Straight away: no settling in
      expect(startBellCount()).toBe(1);
      passMs(90_000);
      expect(audioManager.playAmbient.mock.calls).toEqual([['metta', 0]]);
      expect(audioManager.playBell.mock.calls.filter(([type]) => type === 'interval')).toEqual([]);
    });

    it('is remembered, with the chosen recording', async () => {
      await startGuided();
      click(/^Breath, older/);
      const saved = JSON.parse(localStorage.getItem('wisdomTimerSettings'));
      expect(saved.guidedMode).toBe(true);
      expect(saved.guidedTrack).toBe('breath-30');
    });

    it('cannot be switched or changed during a session', async () => {
      await startGuided();
      click('Start');
      click('Show settings');
      expect(guidedSwitch().disabled).toBe(true);
      expect(button(/^Breath, short/).disabled).toBe(true);
    });
  });
});
