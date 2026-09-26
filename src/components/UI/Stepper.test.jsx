import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Stepper } from './Stepper';

const Harness = ({ onChange }) => {
  const [value, setValue] = useState(5);
  return (
    <Stepper
      value={value}
      steps={[1, 2, 3, 4, 5, 6, 7, 8]}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      label="Test length"
      unit="min"
    />
  );
};

describe('Stepper', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const more = () => screen.getByRole('button', { name: 'Increase test length' });
  // In small act() steps, so React re-renders between repeats as a browser does
  const pass = (ms) => {
    for (; ms > 0; ms -= 10) act(() => vi.advanceTimersByTime(Math.min(ms, 10)));
  };

  it('steps once on a press, then repeats while held, and stops on release', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(more(), { button: 0 });
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([6]);
    pass(449);
    expect(onChange).toHaveBeenCalledTimes(1);
    pass(1 + 90);
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([6, 7, 8]);
    fireEvent.pointerUp(more());
    // The click that follows a pointer press doesn't step again
    fireEvent.click(more(), { detail: 1 });
    pass(1000);
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(more().getAttribute('aria-disabled')).toBe('true');
  });

  it('stops repeating at the last step', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.pointerDown(more(), { button: 0 });
    pass(5000);
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([6, 7, 8]);
    expect(screen.getByRole('group', { name: 'Test length' }).textContent).toBe('8 min');
  });
});
