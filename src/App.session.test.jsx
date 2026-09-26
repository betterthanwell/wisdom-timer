import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { audioManager } from './utils/audioManager';
import { button, click, startBellCount, renderApp, completeOneMinuteSession, setUpAppTests } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// Starting, pausing, completing, and keyboard shortcuts (the App tests are split across App.*.test.jsx)
describe('App', () => {
  setUpAppTests();

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

  // Browsers (iOS strictly) only let sound start without a tap once audio has
  // been unlocked by one; interval and end bells are started by timers

  describe('unlocking audio', () => {
    it('unlocks audio during the Start tap, before the start bell', async () => {
      await renderApp();
      click('Start');

      expect(audioManager.unlock).toHaveBeenCalledTimes(1);
      expect(audioManager.unlock.mock.invocationCallOrder[0]).toBeLessThan(
        audioManager.playBell.mock.invocationCallOrder[0]
      );
    });

    it('unlocks audio when Space starts a session', async () => {
      await renderApp();
      fireEvent.keyDown(window, { code: 'Space', key: ' ' });

      expect(audioManager.unlock).toHaveBeenCalledTimes(1);
    });

    it('unlocks audio on the tap that begins settling in, not later when the countdown ends', async () => {
      await renderApp();
      click('Settle in for 10s');
      click('Start');

      expect(audioManager.unlock).toHaveBeenCalledTimes(1);
      expect(audioManager.playBell).not.toHaveBeenCalled();
    });
  });

  describe('for screen readers', () => {
    it('announces the status as it changes, but not the ticking time', async () => {
      await renderApp();
      const status = screen.getByRole('status');
      expect(status.textContent).toBe('Ready');

      click('Start');
      expect(status.textContent).toBe('Meditating...');
      click('Pause');
      expect(status.textContent).toBe('Paused');
      click('Reset');
      completeOneMinuteSession();
      expect(screen.getByRole('status').textContent).toBe('Complete');
    });
  });

  describe('after a session completes', () => {
    it('rings the end bell and stops the ambient sound', async () => {
      await renderApp();
      click('Rain');
      completeOneMinuteSession();

      expect(audioManager.playBell).toHaveBeenCalledWith('end', 1);
      expect(audioManager.stopAmbient).toHaveBeenCalled();
    });

    it('starts a new session with Play, without needing Reset', async () => {
      await renderApp();
      click('Rain');
      completeOneMinuteSession();
      vi.clearAllMocks();

      expect(button('Start').disabled).toBe(false);
      click('Start');

      expect(screen.getByText('Meditating...')).toBeTruthy();
      expect(screen.getByText('01:00')).toBeTruthy();
      expect(startBellCount()).toBe(1);
      expect(audioManager.playAmbient).toHaveBeenCalledWith('rain');
    });

    it('counts sessions: Session 1, then Session 2 after completing one', async () => {
      await renderApp();
      expect(screen.getByText('Session 1')).toBeTruthy();

      completeOneMinuteSession();
      expect(screen.getByText('Session 1')).toBeTruthy(); // the one just completed

      click('Start');
      expect(screen.getByText('Session 2')).toBeTruthy();
    });

    it('a new session cancels end-bell strikes still to ring, before its start bell', async () => {
      await renderApp();
      completeOneMinuteSession();
      vi.clearAllMocks();
      click('Start');

      const [cancelled] = audioManager.cancelPendingBells.mock.invocationCallOrder;
      const [startBell] = audioManager.playBell.mock.invocationCallOrder;
      expect(cancelled).toBeLessThan(startBell);
    });

    it("resuming doesn't cancel the start bell's strikes", async () => {
      await renderApp();
      click('Start');
      vi.clearAllMocks();
      click('Pause');
      click('Start');
      expect(audioManager.cancelPendingBells).not.toHaveBeenCalled();
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
      expect(button('Decrease custom length').disabled).toBe(true);
      expect(button('Increase custom length').disabled).toBe(true);
    });

    it('unlocks the duration settings after reset', () => {
      click('Reset');
      expect(button('30m').disabled).toBe(false);
      expect(button('Increase custom length').disabled).toBe(false);
    });

    it('keeps the volume sliders usable', () => {
      const bellSlider = screen.getByRole('slider', { name: 'Bells volume' });
      const ambientSlider = screen.getByRole('slider', { name: 'Ambient volume' });
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
      expect(button('Increase custom length').disabled).toBe(true);
    });
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

    it('ignores a held-down Space (key repeat)', async () => {
      await renderApp();
      fireEvent.keyDown(window, { code: 'Space', key: ' ' });
      fireEvent.keyDown(window, { code: 'Space', key: ' ', repeat: true });
      fireEvent.keyDown(window, { code: 'Space', key: ' ', repeat: true });

      expect(screen.getByText('Meditating...')).toBeTruthy();
      expect(startBellCount()).toBe(1);
    });

    it('ignores Space and R until the sounds have loaded, like the Start button', async () => {
      audioManager.init.mockReturnValueOnce(new Promise(() => {}));
      render(<App />);
      expect(button('Start').disabled).toBe(true);

      fireEvent.keyDown(window, { code: 'Space', key: ' ' });
      fireEvent.keyDown(window, { code: 'KeyR', key: 'r' });
      expect(screen.getByText('Ready')).toBeTruthy();
      expect(audioManager.unlock).not.toHaveBeenCalled();
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
});
