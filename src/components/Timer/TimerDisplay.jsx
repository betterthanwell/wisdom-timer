import { formatTime } from '../../utils/timeFormatter';
import { CircularProgress } from './CircularProgress';

export const TimerDisplay = ({ timeRemaining, progress, isRunning, isComplete }) => {
  const getStatusText = () => {
    if (isComplete) return 'Complete';
    if (isRunning) return 'Meditating...';
    return 'Ready';
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <CircularProgress progress={progress} size={280} strokeWidth={10} isRunning={isRunning}>
        <div className="flex flex-col items-center">
          <div
            className={`text-6xl md:text-7xl font-light text-white transition-all duration-300 drop-shadow-lg ${
              isRunning ? 'animate-pulse-slow' : ''
            }`}
            style={{
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5), 0 0 30px rgba(255, 255, 255, 0.3)'
            }}
          >
            {formatTime(timeRemaining)}
          </div>
          <div className="text-sm md:text-base text-white/90 mt-2 drop-shadow-md">
            {getStatusText()}
          </div>
        </div>
      </CircularProgress>
    </div>
  );
};
