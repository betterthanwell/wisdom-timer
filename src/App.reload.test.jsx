import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { audioManager } from './utils/audioManager';
import { button, click, passSeconds, renderApp, setStepper, setUpAppTests, startBellCount } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// A reload mid-sit (a pull to refresh, the browser discarding the tab): the
// sit is kept for the tab and picked up again (the App tests are split
// across App.*.test.jsx)
describe('App after a reload', () => {
  setUpAppTests();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  // The same tab loads the app again: memory is gone, sessionStorage stays.
  // (Controls unlock once audio has initialised - Reset, since the main
  // button may be Pause.)
  const reload = async () => {
    cleanup();
    vi.clearAllMocks();
    render(<App />);
    await waitFor(() => expect(button('Reset').disabled).toBe(false));
  };
  const restore = () => screen.queryByRole('button', { name: 'Restore the bell' });

  it('a running sit runs on to the same end - no start bell - and asks for the tap the end bell needs', async () => {
    await renderApp();
    click('Rain');
    setStepper('Custom length', 10);
    click('Start');
    passSeconds(125); // 07:55 left

    await reload();
    expect(screen.getByText('Meditating...')).toBeTruthy();
    expect(screen.getByText('07:55')).toBeTruthy();
    expect(startBellCount()).toBe(0);
    expect(screen.getByRole('alert').textContent).toMatch(/page reloaded/i);

    // The tap: sound again, ambient included
    fireEvent.click(restore());
    expect(audioManager.unlock).toHaveBeenCalledTimes(1);
    expect(audioManager.playAmbient).toHaveBeenCalledWith('rain');
    expect(restore()).toBe(null);

    passSeconds(475);
    expect(screen.getByText('Complete')).toBeTruthy();
    expect(audioManager.playBell).toHaveBeenCalledWith('end', 1);
  });

  it('a paused sit comes back paused, with the same time left', async () => {
    await renderApp();
    setStepper('Custom length', 10);
    click('Start');
    passSeconds(60);
    click('Pause');

    await reload();
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByText('09:00')).toBeTruthy();
    expect(restore()).toBe(null); // Start is the tap
    click('Start');
    expect(screen.getByText('Meditating...')).toBeTruthy();
    expect(screen.getByText('09:00')).toBeTruthy();
  });

  it('a sit that ended while the page was away says when it ended, until the next Start', async () => {
    vi.setSystemTime(new Date(2026, 8, 27, 9, 0, 0));
    await renderApp();
    setStepper('Custom length', 1);
    click('Start');
    cleanup();

    vi.setSystemTime(new Date(2026, 8, 27, 9, 5, 0));
    await reload();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.getByTestId('sit-ended').textContent).toMatch(/^Your last sit ended at 09:01/);
    expect(audioManager.playBell).not.toHaveBeenCalled();

    click('Start');
    expect(screen.queryByTestId('sit-ended')).toBe(null);
  });

  it('a guided sit comes back paused where it was, with Carry on (its voice needs a tap)', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('switch', { name: 'Guided meditation' }));
    click('Start');
    passSeconds(40); // the voice at 25 s

    await reload();
    expect(screen.getByText('PAUSED')).toBeTruthy();
    fireEvent.click(button('Carry on'));
    expect(audioManager.playAmbient).toHaveBeenLastCalledWith('metta', 25);
    expect(startBellCount()).toBe(0);
  });

  it('keeps nothing after Reset or the end: a reload then starts at Ready', async () => {
    await renderApp();
    setStepper('Custom length', 1);
    click('Start');
    fireEvent.click(button('Reset'), { detail: 0 });
    await reload();
    expect(screen.getByText('Ready')).toBeTruthy();

    click('Start');
    passSeconds(60);
    expect(screen.getByText('Complete')).toBeTruthy();
    await reload();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.queryByTestId('sit-ended')).toBe(null);
  });

  it('ignores a saved sit that no longer fits the settings', async () => {
    sessionStorage.setItem('wisdomTimerSit', JSON.stringify({ mode: 'timed', duration: 999, endsAt: Date.now() + 60_000 }));
    await renderApp();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.getByText('45:00')).toBeTruthy();
  });
});
