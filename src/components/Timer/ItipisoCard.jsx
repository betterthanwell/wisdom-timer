import { GlassCard } from '../UI/GlassCard';
import { ITIPISO_LINES, itipisoStep, paliWords } from '../../utils/itipiso';

const TEXT_SHADOW = '0 1px 3px rgba(120, 53, 15, 0.35), 0 0 24px rgba(255, 255, 255, 0.35)';

// The current Itipi so line on one card above the time: the Pali, then under
// a rule its English. Each Pali word brightens in turn: its animation starts
// `pace` seconds after the one before, offset by how far into the line the
// session is, so a remount mid-line stays in step; pausing freezes it with the
// timer. Through a rest the finished line stays. Like the time, it stays
// bright above the quiet screen's dim (z-20). Each half has a fixed height,
// sized for the longest line (three lines of Pali, four of English on a phone;
// a smaller size on narrow ones, iPhone SE), so nothing jumps.
export const ItipisoCard = ({ elapsed, pace, isRunning }) => {
  const { step, line, wordOffset } = itipisoStep(elapsed, pace);
  const playState = isRunning ? 'running' : 'paused';

  return (
    <GlassCard className="relative z-20 px-5 py-2">
      <div className="flex h-28 items-center justify-center">
        <p
          key={step}
          data-testid="itipiso-pali"
          lang="pi"
          className="itipiso-line text-center text-xl min-[375px]:text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-white text-balance"
          style={{ textShadow: TEXT_SHADOW }}
        >
          {paliWords(ITIPISO_LINES[line]).map((word, index) => (
            <span key={index}>
              {index > 0 && ' '}
              <span
                className="itipiso-word"
                style={{
                  animationDuration: `${pace}s`,
                  animationDelay: `${index * pace - wordOffset}s`,
                  animationPlayState: playState,
                }}
              >
                {word}
              </span>
            </span>
          ))}
        </p>
      </div>
      <hr className="mx-auto w-2/3 border-white/40" />
      <div className="flex h-24 items-center justify-center">
        <p
          key={step}
          data-testid="itipiso-english"
          className="itipiso-line text-center text-sm min-[375px]:text-base sm:text-lg leading-snug text-white/90 text-balance"
          style={{ textShadow: TEXT_SHADOW }}
        >
          {ITIPISO_LINES[line].english}
        </p>
      </div>
    </GlassCard>
  );
};
