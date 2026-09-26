import { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

// Starts on press and repeats while held (touch or mouse); a keyboard press
// (click with detail 0) steps once. Returns the button's event handlers.
// `step` steps once and says whether it could.
const useHoldToRepeat = (step) => {
  const timer = useRef(null);
  // The latest step, with the latest value: repeats outlive their render
  const latestStep = useRef(step);
  useEffect(() => {
    latestStep.current = step;
  });
  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);

  const repeat = (delay) => {
    timer.current = setTimeout(() => {
      if (latestStep.current()) repeat(90);
    }, delay);
  };
  return {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      stop();
      if (latestStep.current()) repeat(450);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: (e) => {
      if (e.detail === 0) latestStep.current();
    },
    // A long press would otherwise open the phone's context menu
    onContextMenu: (e) => e.preventDefault(),
  };
};

const STEP_BUTTON =
  'flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white transition-colors hover:bg-white/20 active:scale-95 select-none touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-40';

// A number stepped through `steps` with - and + buttons: a few taps from a
// preset, rather than a long list to scan. A value between two steps (e.g. a
// saved 12) steps to the neighbouring ones. `label` names the group and the
// buttons ("Decrease custom length"); the new value is announced.
export const Stepper = ({ value, steps, onChange, label, unit, disabled = false }) => {
  const below = steps.findLast((s) => s < value);
  const above = steps.find((s) => s > value);
  // One step to `target`; false once there's nowhere further to go
  const stepTo = (target) => () => {
    if (target === undefined) return false;
    onChange(target);
    return true;
  };
  const decrease = useHoldToRepeat(stepTo(below));
  const increase = useHoldToRepeat(stepTo(above));
  const name = label.toLowerCase();

  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={`Decrease ${name}`}
        aria-disabled={below === undefined}
        disabled={disabled}
        className={STEP_BUTTON}
        {...decrease}
      >
        <Minus className="w-4 h-4" aria-hidden="true" />
      </button>
      <span aria-live="polite" className="min-w-[3.75rem] text-center text-white">
        <span className="text-lg font-medium tabular-nums">{value}</span> <span className="text-sm text-white/70">{unit}</span>
      </span>
      <button
        type="button"
        aria-label={`Increase ${name}`}
        aria-disabled={above === undefined}
        disabled={disabled}
        className={STEP_BUTTON}
        {...increase}
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
