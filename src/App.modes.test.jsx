import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { audioManager } from './utils/audioManager';
import { button, click, passSeconds, renderApp, setStepper, setUpAppTests } from './test/appTestUtils';

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
      expect(screen.queryByRole('group', { name: 'Custom length' })).toBe(null);
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
      vi.clearAllMocks(); // the switch's own sample strike
      setStepper('Woodblock interval', 1);
      setStepper('Woodblock start', 1);
      click('Start');
      passSeconds(180);

      const intervalBells = audioManager.playBell.mock.calls.filter(([type]) => type === 'interval');
      expect(intervalBells).toHaveLength(3);
    });

    it('hits the woodblock first after the starting time, then every interval', async () => {
      await startOpenEnded();
      fireEvent.click(screen.getByRole('switch', { name: 'Interval woodblock' }));
      vi.clearAllMocks(); // the switch's own sample strike
      setStepper('Woodblock interval', 2);
      setStepper('Woodblock start', 1);
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

    it('hides the title during a session, and brings it back after', async () => {
      await renderApp();
      const title = () => screen.queryByRole('heading', { name: 'Wisdom Timer' });
      fireEvent.click(mettaSwitch());
      expect(title()).toBeTruthy();
      click('Start');
      expect(title()).toBe(null);
      click('Reset');
      expect(title()).toBeTruthy();
    });

    it('stays visible on the quiet screen', async () => {
      await renderApp();
      fireEvent.click(mettaSwitch());
      click('Start');
      expect(screen.queryByRole('heading', { name: 'Settings' })).toBe(null);
      expect(phrase()).toBe('May I be happy.');
    });
  });

  describe('itipi so mode', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const itipisoSwitch = () => screen.getByRole('switch', { name: 'Itipi so mode' });
    const mettaSwitch = () => screen.getByRole('switch', { name: 'Metta mode' });
    const pali = () => screen.queryByTestId('itipiso-pali')?.textContent ?? null;
    const english = () => screen.queryByTestId('itipiso-english')?.textContent ?? null;
    const title = () => screen.queryByRole('heading', { name: 'Wisdom Timer' });

    it('is off by default: no cards during a session', async () => {
      await renderApp();
      expect(itipisoSwitch().getAttribute('aria-checked')).toBe('false');
      expect(screen.queryByRole('group', { name: 'Itipi so pace' })).toBe(null);
      click('Start');
      passSeconds(15);
      expect(pali()).toBe(null);
      expect(english()).toBe(null);
    });

    it('shows the Pali and the English, line by line, at 2 s a word', async () => {
      await renderApp();
      fireEvent.click(itipisoSwitch());
      expect(screen.getByText('Itipi so.')).toBeTruthy();
      expect(pali()).toBe(null); // only during a session

      click('Start');
      expect(pali()).toBe('Itipi so bhagavā arahaṃ sammāsambuddho');
      expect(english()).toBe('That Blessed One is perfected, a fully awakened Buddha,');
      passSeconds(10); // five words
      expect(pali()).toBe('vijjācaraṇasampanno sugato lokavidū');
      expect(english()).toBe('accomplished in knowledge and conduct, holy, knower of the world,');
    });

    it('shows the Pali and, under a rule, the English on one card above the time', async () => {
      await renderApp();
      fireEvent.click(itipisoSwitch());
      click('Start');
      const paliLine = screen.getByTestId('itipiso-pali');
      const card = paliLine.closest('.glass-card');
      const rule = within(card).getByRole('separator');
      const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(card.contains(screen.getByTestId('itipiso-english'))).toBe(true);
      expect(follows(paliLine, rule)).toBe(true);
      expect(follows(rule, screen.getByTestId('itipiso-english'))).toBe(true);
      expect(follows(card, screen.getByTestId('nimitta'))).toBe(true);
    });

    it('holds the line while paused and carries on after resuming', async () => {
      await renderApp();
      fireEvent.click(itipisoSwitch());
      click('Start');
      passSeconds(12);
      click('Pause');
      passSeconds(60);
      expect(pali()).toBe('vijjācaraṇasampanno sugato lokavidū');

      click('Start');
      passSeconds(4);
      expect(pali()).toMatch(/^anuttaro purisadammasārathi/);
    });

    it('goes away on Reset', async () => {
      await renderApp();
      fireEvent.click(itipisoSwitch());
      click('Start');
      click('Reset');
      expect(pali()).toBe(null);
      expect(english()).toBe(null);
    });

    it('follows the chosen pace, and remembers it', async () => {
      await renderApp();
      fireEvent.click(itipisoSwitch());
      expect(button('2 seconds per word').getAttribute('aria-pressed')).toBe('true');
      click('1 second per word');
      expect(JSON.parse(localStorage.getItem('wisdomTimerSettings'))).toMatchObject({ itipisoMode: true, itipisoPace: 1 });

      click('Start');
      passSeconds(5);
      expect(pali()).toBe('vijjācaraṇasampanno sugato lokavidū');
    });

    it('can’t be on with metta mode: either one turns the other off', async () => {
      await renderApp();
      fireEvent.click(mettaSwitch());
      fireEvent.click(itipisoSwitch());
      expect(mettaSwitch().getAttribute('aria-checked')).toBe('false');
      expect(itipisoSwitch().getAttribute('aria-checked')).toBe('true');

      fireEvent.click(mettaSwitch());
      expect(itipisoSwitch().getAttribute('aria-checked')).toBe('false');
      expect(mettaSwitch().getAttribute('aria-checked')).toBe('true');
    });

    it('stays visible on the quiet screen, in place of the title', async () => {
      await renderApp();
      fireEvent.click(itipisoSwitch());
      expect(title()).toBeTruthy();
      click('Start');
      expect(screen.queryByRole('heading', { name: 'Settings' })).toBe(null);
      expect(title()).toBe(null);
      expect(pali()).toBeTruthy();
      click('Reset');
      expect(title()).toBeTruthy();
    });

    it('isn’t offered in guided mode', async () => {
      await renderApp();
      fireEvent.click(screen.getByRole('switch', { name: 'Guided meditation' }));
      expect(screen.queryByRole('switch', { name: 'Itipi so mode' })).toBe(null);
    });
  });
});
