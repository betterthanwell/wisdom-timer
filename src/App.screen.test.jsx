import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, render } from '@testing-library/react';
import App from './App';
import { audioManager } from './utils/audioManager';
import { button, click, renderApp, setUpAppTests } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// Quiet screen, keep screen awake, saved settings (the App tests are split across App.*.test.jsx)
describe('App', () => {
  setUpAppTests();

  describe('quiet screen while sitting', () => {
    const settingsVisible = () => screen.queryByRole('heading', { name: 'Settings' }) !== null;
    const dimmed = () => screen.getByTestId('quiet-dim').className.includes('opacity-100');

    it('hides the settings and keyboard hint, and dims the page, while running', async () => {
      await renderApp();
      expect(settingsVisible()).toBe(true);
      expect(dimmed()).toBe(false);
      expect(screen.getByTestId('keyboard-hint')).toBeTruthy();

      click('Start');
      expect(settingsVisible()).toBe(false);
      expect(screen.queryByTestId('keyboard-hint')).toBe(null);
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

    const dimColor = () => screen.getByTestId('quiet-dim').style.backgroundColor;
    const dimLevel = () => screen.getByRole('slider', { name: 'Dimming level' });

    it('dims to the chosen level', async () => {
      await renderApp();
      expect(dimColor()).toBe('rgba(0, 0, 0, 0.25)');

      fireEvent.change(dimLevel(), { target: { value: '60' } });
      expect(dimColor()).toBe('rgba(0, 0, 0, 0.6)');
      click('Start');
      expect(dimmed()).toBe(true);
    });

    it('with dimming off, still hides the settings but leaves the page bright', async () => {
      await renderApp();
      fireEvent.click(screen.getByRole('switch', { name: 'Dim the screen' }));
      expect(screen.queryByRole('slider', { name: 'Dimming level' })).toBe(null);

      click('Start');
      expect(settingsVisible()).toBe(false);
      expect(dimmed()).toBe(false);
    });

    // So the level can be chosen without starting a session
    it('shows the dimming for a moment while its level is changed', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await renderApp();
      fireEvent.change(dimLevel(), { target: { value: '50' } });
      expect(dimmed()).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(dimmed()).toBe(false);
    });

    it('remembers dimming and its level', async () => {
      await renderApp();
      fireEvent.change(dimLevel(), { target: { value: '40' } });
      fireEvent.click(screen.getByRole('switch', { name: 'Dim the screen' }));
      const saved = JSON.parse(localStorage.getItem('wisdomTimerSettings'));
      expect(saved.dimScreen).toBe(false);
      expect(saved.dimLevel).toBe(0.4);
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

  describe('the glow around the time (nimitta)', () => {
    // How each glow layer's breathing animation is set to play
    const breath = () => [
      ...new Set(
        [...screen.getByTestId('nimitta').querySelectorAll('.nimitta-breath')].map((el) => el.style.animationPlayState)
      ),
    ];

    it('breathes while a session runs, and holds still when paused or reset', async () => {
      await renderApp();
      expect(breath()).toEqual(['paused']);

      click('Start');
      expect(breath()).toEqual(['running']);

      click('Pause');
      expect(breath()).toEqual(['paused']);

      click('Start');
      click('Reset');
      expect(breath()).toEqual(['paused']);
    });

    it('breathes while settling in, too', async () => {
      await renderApp();
      click('Settle in for 10s');
      click('Start');
      expect(screen.getByText('Settling in…')).toBeTruthy();
      expect(breath()).toEqual(['running']);

      click('Cancel');
      expect(breath()).toEqual(['paused']);
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
      expect(button('None').getAttribute('aria-pressed')).toBe('true'); // selected
      expect(screen.getAllByRole('slider')[0].value).toBe('70'); // default bell volume
    });

    it('cannot start a 0:00 session', async () => {
      await renderApp();
      fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('Seconds'), { target: { value: '0' } });

      expect(button('Start').disabled).toBe(true);
    });

    it('offers the woodblock every 10 minutes, starting after 5, by default', async () => {
      await renderApp();
      expect(screen.getByText('Interval Woodblock')).toBeTruthy();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval woodblock' }));

      expect(screen.getByText(/Hit the woodblock every/)).toBeTruthy();
      expect(screen.getByLabelText('Interval in minutes').value).toBe('10');
      expect(screen.getByText(/Starting after/)).toBeTruthy();
      expect(screen.getByLabelText('Starting after, in minutes').value).toBe('5');
    });

    it('keeps the starting time between 1 and 60 minutes, and remembers it', async () => {
      await renderApp();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval woodblock' }));
      const start = screen.getByLabelText('Starting after, in minutes');

      fireEvent.change(start, { target: { value: '99' } });
      expect(start.value).toBe('60');
      fireEvent.change(start, { target: { value: '0' } });
      expect(start.value).toBe('1');
      fireEvent.change(start, { target: { value: '20' } });
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).intervalStart).toBe(1200);
    });

    it('caps the interval at 30 minutes', async () => {
      await renderApp();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval woodblock' }));
      const interval = screen.getByLabelText('Interval in minutes');

      fireEvent.change(interval, { target: { value: '99' } });
      expect(interval.value).toBe('30');
    });
  });
});
