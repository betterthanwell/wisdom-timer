import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, render } from '@testing-library/react';
import App from './App';
import { audioManager } from './utils/audioManager';
import { button, click, renderApp, setStepper, setUpAppTests, stepperValue } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// ?debug, switchable per test (App reads it while rendering)
const tools = vi.hoisted(() => ({ speed: 1, debug: false }));
vi.mock('./utils/testingTools', async (importOriginal) => ({ ...(await importOriginal()), testingTools: tools }));

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

    it('keeps dimming under Visual controls, the last settings section, after volume', async () => {
      await renderApp();
      const sections = [...screen.getByTestId('nimitta').ownerDocument.querySelectorAll('section')];
      const last = sections.at(-1);
      expect(last.textContent).toMatch(/^Visual controls/);
      expect(last.contains(screen.getByRole('switch', { name: 'Dim the screen' }))).toBe(true);
      expect(sections.at(-2).contains(screen.getByRole('slider', { name: 'Bells volume' }))).toBe(true);
      // No empty section left where dimming was
      expect(sections.every((section) => section.textContent.trim() !== '')).toBe(true);
    });

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

    // Each glow layer's inset (its size around the ring)
    const glowInsets = () =>
      [...screen.getByTestId('nimitta').querySelectorAll('.nimitta-breath')].map((el) => el.style.inset);

    it('offers no size control outside ?debug', async () => {
      await renderApp();
      expect(screen.queryByRole('slider', { name: 'Nimitta size' })).toBe(null);
    });

    it('with ?debug, can be made larger or smaller under Visual controls', async () => {
      tools.debug = true;
      try {
        await renderApp();
        const before = glowInsets();
        const slider = screen.getByRole('slider', { name: 'Nimitta size' });
        expect(slider.closest('section').textContent).toMatch(/^Visual controls/);
        // 25-400%, in steps that land on 100%
        expect([slider.min, slider.max, slider.step]).toEqual(['25', '400', '5']);

        fireEvent.change(slider, { target: { value: '150' } });
        // The outer glow, 2.85x the ring: 4.275x at 150%
        expect(parseFloat(glowInsets()[0])).toBeCloseTo(-163.75);
        fireEvent.change(slider, { target: { value: '100' } });
        expect(glowInsets()).toEqual(before);
      } finally {
        tools.debug = false;
      }
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

    it('keeps the screen awake while running, with no switch to turn that off', async () => {
      await renderApp();
      expect(screen.queryByRole('switch', { name: 'Keep screen awake' })).toBe(null);
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

    // It could be turned off while it had a switch
    it('keeps the screen awake even if it was turned off before', async () => {
      localStorage.setItem('wisdomTimerSettings', JSON.stringify({ keepScreenAwake: false }));
      await renderApp();
      click('Start');
      await waitFor(() => expect(wakeLock.request).toHaveBeenCalledWith('screen'));
    });
  });

  describe('settings validation', () => {
    it('shows that the bells are loading, with Start disabled until they are ready', async () => {
      audioManager.init.mockImplementationOnce(() => new Promise(() => {}));
      render(<App />);

      expect(screen.getByText('Loading bells…')).toBeTruthy();
      expect(button('Start').disabled).toBe(true);
    });

    it('hides the loading notice once the bells are ready', async () => {
      await renderApp();
      expect(screen.queryByText('Loading bells…')).toBe(null);
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
      expect(screen.getByRole('slider', { name: 'Bells volume' }).value).toBe('70'); // default bell volume
    });

    it('offers the woodblock every 10 minutes, starting after 5, by default', async () => {
      await renderApp();
      expect(screen.getByText('Interval Woodblock')).toBeTruthy();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval woodblock' }));

      expect(screen.getByText('Every')).toBeTruthy();
      expect(stepperValue('Woodblock interval')).toBe(10);
      expect(screen.getByText(/Starting after/)).toBeTruthy();
      expect(stepperValue('Woodblock start')).toBe(5);
    });

    it('steps the woodblock times: 1 minute at a time up to 10, then 5 - every 1-30 minutes, starting after 1-60', async () => {
      await renderApp();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval woodblock' }));
      expect(stepperValue('Woodblock interval')).toBe(10);
      click('Increase woodblock interval');
      expect(stepperValue('Woodblock interval')).toBe(15);
      setStepper('Woodblock interval', 30);
      click('Increase woodblock interval');
      expect(stepperValue('Woodblock interval')).toBe(30);

      expect(stepperValue('Woodblock start')).toBe(5);
      click('Decrease woodblock start');
      expect(stepperValue('Woodblock start')).toBe(4);
      setStepper('Woodblock start', 1);
      click('Decrease woodblock start');
      expect(stepperValue('Woodblock start')).toBe(1);
      setStepper('Woodblock start', 60);
      click('Increase woodblock start');
      expect(stepperValue('Woodblock start')).toBe(60);

      const saved = JSON.parse(localStorage.getItem('wisdomTimerSettings'));
      expect([saved.intervalDuration, saved.intervalStart]).toEqual([1800, 3600]);
    });

    it('steps the custom length in whole minutes, 1 at a time up to 10, then 5, from 1 to 99', async () => {
      await renderApp();
      expect(stepperValue('Custom length')).toBe(45);
      click('Increase custom length');
      expect(screen.getByText('50:00')).toBeTruthy();
      setStepper('Custom length', 10);
      click('Decrease custom length');
      expect(stepperValue('Custom length')).toBe(9);
      setStepper('Custom length', 1);
      click('Decrease custom length');
      expect(stepperValue('Custom length')).toBe(1);
      expect(button('Start').disabled).toBe(false);

      setStepper('Custom length', 95);
      click('Increase custom length');
      expect(stepperValue('Custom length')).toBe(99);
      click('Increase custom length');
      expect(stepperValue('Custom length')).toBe(99);
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings')).duration).toBe(5940);
    });

    it('steps from a length between the steps to the next one', async () => {
      localStorage.setItem('wisdomTimerSettings', JSON.stringify({ duration: 12 * 60 }));
      await renderApp();
      expect(stepperValue('Custom length')).toBe(12);
      click('Increase custom length');
      expect(stepperValue('Custom length')).toBe(15);
    });
  });
});
