import { formatTime } from '../../utils/timeFormatter';
import { CircularProgress } from './CircularProgress';

export const TimerDisplay = ({ timeRemaining, progress, isRunning, isComplete }) => {
  const getStatusText = () => {
    if (isComplete) return 'Complete';
    if (isRunning) return 'Meditating...';
    return 'Ready';
  };

  return (
    <>
      {/* Enlightenment Burst Animation */}
      {isComplete && (
        <>
          {/* Darkening overlay for contrast */}
          <div
            className="fixed inset-0 pointer-events-none z-50"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              animation: 'enlightenmentDarken 9s ease-in-out forwards'
            }}
          />
          {/* Light burst */}
          <div
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
            style={{
              animation: 'enlightenmentBurst 9s ease-out forwards'
            }}
          >
            <div
              className="aspect-square"
              style={{
                width: '200vh',
                height: '200vh',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(253, 230, 138, 0.8) 30%, rgba(251, 191, 36, 0.4) 60%, transparent 100%)',
              }}
            />
          </div>
        </>
      )}

      <div className="flex flex-col items-center justify-center">
        <CircularProgress progress={progress} size={280} strokeWidth={10} isRunning={isRunning}>
          <div className="flex flex-col items-center">
            <div
              className={`text-6xl md:text-7xl font-bold text-white transition-all duration-300 ${
                isRunning ? 'animate-pulse-slow' : ''
              }`}
              style={{
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.4), 0 0 30px rgba(255, 255, 255, 0.2)',
                WebkitTextStroke: '1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm md:text-base text-white/90 mt-2 font-semibold drop-shadow-md">
              {getStatusText()}
            </div>
          </div>
        </CircularProgress>
      </div>
    </>
  );
};
