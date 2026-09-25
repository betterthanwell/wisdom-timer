import { afterEach, beforeEach, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { audioManager } from '../utils/audioManager';

// Shared by the App.*.test.jsx files, which render the whole app with
// audioManager replaced by spies (they check what the app asks for). Each
// test file mocks audioManager with this factory:
//   vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));
// (The App tests are split into several files so Vitest runs them in
// parallel - as one file they took ~14 s.)

export const button = (name) => screen.getByRole('button', { name });
export const click = (name) => fireEvent.click(button(name));
export const startBellCount = () => audioManager.playBell.mock.calls.filter(([type]) => type === 'start').length;

export const renderApp = async () => {
  render(<App />);
  // Controls unlock once audio has initialised
  await waitFor(() => expect(button('Start').disabled).toBe(false));
  // ...and let the effects of that render run too: the keyboard shortcuts'
  // listener only sees the loaded sounds once its effect has re-run (under
  // load, a Space pressed right away was sometimes ignored)
  await act(async () => {});
};

// Runs a 1-second session to completion on a fake clock
export const completeOneSecondSession = () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Seconds'), { target: { value: '1' } });
  click('Start');
  act(() => {
    vi.advanceTimersByTime(1100);
  });
  expect(screen.getByText('Complete')).toBeTruthy();
};

// Fresh settings and spies for every test
export const setUpAppTests = () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
};
