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
};

// The number a stepper (UI/Stepper, named by its group) shows
export const stepperValue = (name) => parseInt(screen.getByRole('group', { name }).textContent);

// Steps a stepper to `minutes` with its - and + buttons
export const setStepper = (name, minutes) => {
  for (let i = 0; i < 40 && stepperValue(name) !== minutes; i++) {
    click(`${stepperValue(name) < minutes ? 'Increase' : 'Decrease'} ${name.toLowerCase()}`);
  }
  expect(stepperValue(name)).toBe(minutes);
};

// Runs a 1-minute session to completion on a fake clock
export const completeOneMinuteSession = () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setStepper('Custom length', 1);
  click('Start');
  act(() => {
    vi.advanceTimersByTime(60_100);
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
