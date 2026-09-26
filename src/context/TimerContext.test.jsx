import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TimerProvider } from './TimerContext';
import { useTimerContext } from './useTimerContext';

const saved = () => JSON.parse(localStorage.getItem('wisdomTimerSettings'));

const ChooseThirtyMinutes = () => {
  const { actions } = useTimerContext();
  return <button onClick={() => actions.setDuration(1800)}>30m</button>;
};

describe('TimerProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('saves a setting as soon as it is chosen, so a reload right after keeps it', async () => {
    render(<TimerProvider><ChooseThirtyMinutes /></TimerProvider>);
    // A real click, as the browser delivers it - not wrapped in act(), which
    // would run every pending render and effect before we look
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    screen.getByRole('button', { name: '30m' }).click();
    // React renders the click in a microtask; nothing else (a reload, a
    // timer) can come in between. Wait for microtasks only.
    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(saved().duration).toBe(1800);
  });
});
