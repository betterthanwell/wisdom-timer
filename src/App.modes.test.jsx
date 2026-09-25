import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { audioManager } from './utils/audioManager';
import { button, click, renderApp, setUpAppTests } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// Open-ended sitting and metta mode (the App tests are split across App.*.test.jsx)
describe('App', () => {
  setUpAppTests();

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

    it('hides the duration settings and starts from 00:00', async () => {
      await startOpenEnded();
      expect(screen.queryByRole('button', { name: '45m' })).toBe(null);
      expect(screen.queryByLabelText('Minutes')).toBe(null);
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
      fireEvent.click(screen.getByRole('switch', { name: 'Interval woodblock' }));
      fireEvent.change(screen.getByLabelText('Interval in minutes'), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText('Starting after, in minutes'), { target: { value: '1' } });
      click('Start');
      passSeconds(180);

      const intervalBells = audioManager.playBell.mock.calls.filter(([type]) => type === 'interval');
      expect(intervalBells).toHaveLength(3);
    });

    it('hits the woodblock first after the starting time, then every interval', async () => {
      await startOpenEnded();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval woodblock' }));
      fireEvent.change(screen.getByLabelText('Interval in minutes'), { target: { value: '2' } });
      fireEvent.change(screen.getByLabelText('Starting after, in minutes'), { target: { value: '1' } });
      click('Start');
      const woodblocks = () => audioManager.playBell.mock.calls.filter(([type]) => type === 'interval').length;

      passSeconds(59);
      expect(woodblocks()).toBe(0);
      passSeconds(1);
      expect(woodblocks()).toBe(1); // 1:00
      passSeconds(119);
      expect(woodblocks()).toBe(1);
      passSeconds(1);
      expect(woodblocks()).toBe(2); // 3:00
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

  describe('metta mode', () => {
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
    const mettaSwitch = () => screen.getByRole('switch', { name: 'Metta mode' });
    const phrase = () => screen.queryByTestId('metta-phrase')?.textContent ?? null;

    it('is off by default: no phrases during a session', async () => {
      await renderApp();
      expect(mettaSwitch().getAttribute('aria-checked')).toBe('false');
      expect(screen.queryByRole('group', { name: 'Metta pace' })).toBe(null);
      click('Start');
      passSeconds(15);
      expect(phrase()).toBe(null);
    });

    it('shows the phrases in turn while running, from oneself to all beings, then again', async () => {
      await renderApp();
      fireEvent.click(mettaSwitch());
      expect(phrase()).toBe(null); // only during a session

      click('Start');
      expect(phrase()).toBe('May I be happy.');
      passSeconds(10);
      expect(phrase()).toBe('May my loved ones be happy.');
      passSeconds(10);
      expect(phrase()).toBe('May those I find difficult be happy.');
      passSeconds(10);
      expect(phrase()).toBe('May all beings everywhere be happy.');
      passSeconds(10);
      expect(phrase()).toBe('May I be happy.');
    });

    it('holds the phrase while paused and carries on after resuming', async () => {
      await renderApp();
      fireEvent.click(mettaSwitch());
      click('Start');
      passSeconds(15);
      click('Pause');
      passSeconds(60);
      expect(phrase()).toBe('May my loved ones be happy.');

      click('Start');
      passSeconds(5);
      expect(phrase()).toBe('May those I find difficult be happy.');
    });

    it('goes away on Reset', async () => {
      await renderApp();
      fireEvent.click(mettaSwitch());
      click('Start');
      click('Reset');
      expect(phrase()).toBe(null);
    });

    it('follows the chosen pace, and remembers it', async () => {
      await renderApp();
      fireEvent.click(mettaSwitch());
      click('5 seconds per phrase');
      expect(button('5 seconds per phrase').getAttribute('aria-pressed')).toBe('true');
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings'))).toMatchObject({ mettaMode: true, mettaSeconds: 5 });

      click('Start');
      passSeconds(5);
      expect(phrase()).toBe('May my loved ones be happy.');
    });

    it('offers 10 seconds per phrase by default', async () => {
      await renderApp();
      fireEvent.click(mettaSwitch());
      expect(button('10 seconds per phrase').getAttribute('aria-pressed')).toBe('true');
    });

    it('stays visible on the quiet screen', async () => {
      await renderApp();
      fireEvent.click(mettaSwitch());
      click('Start');
      expect(screen.queryByRole('heading', { name: 'Settings' })).toBe(null);
      expect(phrase()).toBe('May I be happy.');
    });
  });
});
