import { GlassCard } from '../UI/GlassCard';
import { ITIPISO_LINES, itipisoStep, paliWords } from '../../utils/itipiso';

const TEXT_SHADOW = '0 1px 3px rgba(120, 53, 15, 0.35), 0 0 24px rgba(255, 255, 255, 0.35)';

// The current Itipi so line in Pali, below the time. Each word brightens in
// turn: its animation starts `pace` seconds after the one before, offset by
// how far into the line the session is, so a remount mid-line stays in step;
// pausing freezes it with the timer. Through a rest the finished line stays.
// Like the time, it stays bright above the quiet screen's dim (z-20). Sized
// for the longest line: three lines of text on a phone, a smaller size on
// narrow ones (iPhone SE).
export const ItipisoPali = ({ elapsed, pace, isRunning }) => {
  const { step, line, wordOffset } = itipisoStep(elapsed, pace);
  const playState = isRunning ? 'running' : 'paused';

  return (
    <GlassCard className="relative z-20 flex h-28 items-center justify-center px-5">
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
    </GlassCard>
  );
};

// The same line in English, above the time: shown whole, softer
export const ItipisoEnglish = ({ elapsed, pace }) => {
  const { step, line } = itipisoStep(elapsed, pace);

  return (
    <GlassCard className="relative z-20 flex h-24 items-center justify-center px-5">
      <p
        key={step}
        data-testid="itipiso-english"
        className="itipiso-line text-center text-sm min-[375px]:text-base sm:text-lg leading-snug text-white/90 text-balance"
        style={{ textShadow: TEXT_SHADOW }}
      >
        {ITIPISO_LINES[line].english}
      </p>
    </GlassCard>
  );
};
