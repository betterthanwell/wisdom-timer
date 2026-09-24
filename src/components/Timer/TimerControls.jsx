import { Play, Pause, RotateCcw, X, Flag } from 'lucide-react';
import { Button } from '../UI/Button';

export const TimerControls = ({
  isRunning,
  isSettling = false,
  onStart,
  onPause,
  onCancel,
  onReset,
  onFinish,
  showFinish = false,
  disabled = false,
  startDisabled = false,
}) => {
  // While settling in, the main button cancels back to Ready
  const onClick = isSettling ? onCancel : isRunning ? onPause : onStart;
  const label = isSettling ? 'Cancel' : isRunning ? 'Pause' : 'Start';

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Play/Pause Button */}
      <Button
        variant="icon"
        size="icon"
        onClick={onClick}
        disabled={disabled || (label === 'Start' && startDisabled)}
        aria-label={label}
        className="w-16 h-16 rounded-full"
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
          className="w-12 h-12 rounded-full"
        >
          <Flag className="w-5 h-5" />
        </Button>
      )}

      {/* Reset Button */}
      <Button
        variant="icon"
        size="icon"
        onClick={onReset}
        disabled={disabled}
        aria-label="Reset"
        className="w-12 h-12 rounded-full"
      >
        <RotateCcw className="w-5 h-5" />
      </Button>
    </div>
  );
};
