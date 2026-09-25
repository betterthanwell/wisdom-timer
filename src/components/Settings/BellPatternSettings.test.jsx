import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BellPatternSettings } from './BellPatternSettings';

// Not shown in the app for now (saved strike counts still apply), but kept
// working for when it comes back
describe('BellPatternSettings', () => {
  afterEach(cleanup);

  const strikes = { start: 1, interval: 1, end: 2 };

  it('tucks the choices away behind its switch', () => {
    const onShownChange = vi.fn();
    render(<BellPatternSettings strikes={strikes} onChange={vi.fn()} shown={false} onShownChange={onShownChange} />);
    expect(screen.queryByRole('button', { name: 'End bell: 2 strikes' })).toBe(null);

    fireEvent.click(screen.getByRole('switch', { name: 'Show bell strikes' }));
    expect(onShownChange).toHaveBeenCalledWith(true);
  });

  it('shows the chosen counts, and reports a new choice', () => {
    const onChange = vi.fn();
    render(<BellPatternSettings strikes={strikes} onChange={onChange} shown onShownChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'End bell: 2 strikes' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Start bell: 3 strikes' }));
    expect(onChange).toHaveBeenCalledWith('start', 3);
  });
});
