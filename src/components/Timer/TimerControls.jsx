import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '../UI/Button';

export const TimerControls = ({ isRunning, onStart, onPause, onReset, disabled = false }) => {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Play/Pause Button */}
      <Button
        variant="icon"
        size="icon"
        onClick={isRunning ? onPause : onStart}
        disabled={disabled}
        className="w-16 h-16 rounded-full"
      >
        {isRunning ? (
          <Pause className="w-7 h-7" />
        ) : (
          <Play className="w-7 h-7" />
        )}
      </Button>

      {/* Reset Button */}
      <Button
        variant="icon"
        size="icon"
        onClick={onReset}
        disabled={disabled}
        className="w-12 h-12 rounded-full"
      >
        <RotateCcw className="w-5 h-5" />
      </Button>
    </div>
  );
};
