import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, X, Flag } from 'lucide-react';
import { Button } from '../UI/Button';

// How long Reset has to be held to end a sit in progress
export const HOLD_TO_RESET_MS = 1000;

// Reset during a sit needs a hold (touch or mouse): a stray tap on a phone
// lying on a cushion shouldn't end it. Letting go too soon shows a hint for
// a moment. A keyboard press (click with detail 0) resets at once - it's
// deliberate, and holding is hard with a screen reader. Returns the button's
// event handlers, whether it's being held, and whether to show the hint.
const useHoldToReset = (onReset, required) => {
  const holdTimer = useRef(null);
  const hintTimer = useRef(null);
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  // The latest onReset: a hold outlives its render
  const latestReset = useRef(onReset);
  useEffect(() => {
    latestReset.current = onReset;
  });
  useEffect(
    () => () => {
      clearTimeout(holdTimer.current);
      clearTimeout(hintTimer.current);
    },
    []
  );

  if (!required) return { handlers: { onClick: onReset }, holding: false, hint: false };

  const letGo = () => {
    if (holdTimer.current === null) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    setHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), 2500);
  };
  return {
    handlers: {
      onPointerDown: (e) => {
        if (e.button !== 0) return;
        clearTimeout(holdTimer.current);
        setHolding(true);
        setHint(false);
        holdTimer.current = setTimeout(() => {
          holdTimer.current = null;
          setHolding(false);
          latestReset.current();
        }, HOLD_TO_RESET_MS);
      },
      onPointerUp: letGo,
      onPointerLeave: letGo,
      onPointerCancel: letGo,
      onClick: (e) => {
        if (e.detail === 0) latestReset.current();
      },
      // A long press would otherwise open the phone's context menu
      onContextMenu: (e) => e.preventDefault(),
    },
    holding,
    hint,
  };
};

export const TimerControls = ({
  isRunning,
  isSettling = false,
  onStart,
  onPause,
  onCancel,
  onReset,
  onFinish,
  showFinish = false,
  holdToReset = false,
  disabled = false,
  startDisabled = false,
}) => {
  const reset = useHoldToReset(onReset, holdToReset);
  // While settling in, the main button cancels back to Ready
  const onClick = isSettling ? onCancel : isRunning ? onPause : onStart;
  const label = isSettling ? 'Cancel' : isRunning ? 'Pause' : 'Start';

  return (
    <div>
      <div className="flex items-center justify-center gap-4">
        {/* Play/Pause Button */}
        <Button
          variant="icon"
          size="icon"
          onClick={onClick}
          disabled={disabled || (label === 'Start' && startDisabled)}
          aria-label={label}
          round
          className="w-16 h-16"
        >
          {isSettling ? (
            <X className="w-7 h-7" />
          ) : isRunning ? (
            <Pause className="w-7 h-7" />
          ) : (
            <Play className="w-7 h-7" />
          )}
        </Button>

        {/* Finish Button (open-ended sitting) */}
        {showFinish && (
          <Button
            variant="icon"
            size="icon"
            onClick={onFinish}
            disabled={disabled}
            aria-label="Finish"
            round
            className="w-12 h-12"
          >
            <Flag className="w-5 h-5" />
          </Button>
        )}

        {/* Reset Button - held during a sit, filling up as it's held */}
        <Button
          variant="icon"
          size="icon"
          disabled={disabled}
          aria-label="Reset"
          round
          className="relative w-12 h-12 overflow-hidden select-none touch-manipulation [-webkit-touch-callout:none]"
          {...reset.handlers}
        >
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded-full bg-white/35 ease-linear ${
              reset.holding ? 'scale-100 transition-transform duration-1000' : 'scale-0'
            }`}
          />
          <RotateCcw className="relative w-5 h-5" />
        </Button>
      </div>
      {reset.hint && (
        <p aria-live="polite" className="mt-3 text-center text-xs text-white/80">
          Hold Reset to end the sit
        </p>
      )}
    </div>
  );
};
