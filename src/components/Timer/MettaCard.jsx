import { GlassCard } from '../UI/GlassCard';
import { METTA_PHRASES, mettaStep } from '../../utils/metta';

// The current metta phrase in large letters. Each new step remounts the
// phrase (key), which restarts its fade in - hold - fade out; pausing
// freezes the fade along with the timer.
export const MettaCard = ({ elapsed, seconds, isRunning }) => {
  const { step, phrase } = mettaStep(elapsed, seconds);

  return (
    <GlassCard className="flex h-40 sm:h-36 items-center justify-center px-5">
      <p
        key={step}
        data-testid="metta-phrase"
        className="metta-phrase text-center text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-white text-balance"
        style={{
          animationDuration: `${seconds}s`,
          animationPlayState: isRunning ? 'running' : 'paused',
          textShadow: '0 1px 3px rgba(120, 53, 15, 0.35), 0 0 24px rgba(255, 255, 255, 0.35)',
        }}
      >
        {METTA_PHRASES[phrase]}
      </p>
    </GlassCard>
  );
};
