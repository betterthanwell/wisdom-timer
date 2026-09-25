import { formatClockTime, formatTime } from '../../utils/timeFormatter';
import { CircularProgress } from './CircularProgress';

export const TimerDisplay = ({ timeRemaining, progress, isRunning, isPaused = false, isComplete, sessionNumber = 1, endsAt = null, settleRemaining = null }) => {
  const isSettling = settleRemaining !== null;
  const getStatusText = () => {
    if (isSettling) return 'Settling in…';
    if (isComplete) return 'Complete';
    if (isRunning) return 'Meditating...';
    if (isPaused) return 'Paused';
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

      {/* The time as a radiant glow (nimitta), free of any card. It stays
          bright above the quiet screen's dim while the rest of the page dims. */}
      <div data-testid="nimitta" className="relative z-20 flex flex-col items-center py-2 sm:py-6">
        <CircularProgress
          progress={isSettling ? 0 : progress}
          breathing={isRunning || isSettling}
          className="w-[min(16rem,68vw)] sm:w-72"
        >
          <div
            className="flex flex-col items-center"
            style={{ textShadow: '0 1px 3px rgba(120, 53, 15, 0.35), 0 0 18px rgba(255, 255, 255, 0.5)' }}
          >
            <div className="text-5xl sm:text-6xl font-semibold tabular-nums tracking-tight text-white">
              {formatTime(isSettling ? settleRemaining : timeRemaining)}
            </div>
            {/* Announced by screen readers when it changes (the time isn't:
                it would be read out every second) */}
            <div role="status" className="mt-1 text-sm font-semibold text-white">
              {getStatusText()}
            </div>
            <div className="text-xs font-medium text-white/85">
              Session {sessionNumber}
            </div>
          </div>
        </CircularProgress>
        {/* Keeps its height when empty, so nothing jumps when a session starts */}
        <div className="h-5 mt-2 text-sm font-medium text-white/85" style={{ textShadow: '0 1px 3px rgba(120, 53, 15, 0.35)' }}>
          {endsAt !== null && `Ends at ${formatClockTime(endsAt)}`}
        </div>
      </div>
    </>
  );
};
