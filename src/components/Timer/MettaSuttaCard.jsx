import { GlassCard } from '../UI/GlassCard';
import { RecitedWords } from './RecitedWords';
import { METTA_SUTTA_COUPLETS, mettaSuttaStep } from '../../utils/mettaSutta';

// The current Metta Sutta couplet on a card above the time, its words
// brightening in turn (RecitedWords); through a breath or rest it stays.
// Like the time, it stays bright above the quiet screen's dim (z-20). A fixed
// height, sized for the longest couplet (a smaller size on narrow phones), so
// nothing jumps.
export const MettaSuttaCard = ({ elapsed, pace, isRunning }) => {
  const { step, line, wordOffset } = mettaSuttaStep(elapsed, pace);

  return (
    <GlassCard className="relative z-20 flex h-32 items-center justify-center px-5">
      <p
        key={step}
        data-testid="metta-sutta-verse"
        className="recitation-line text-center text-lg min-[375px]:text-xl sm:text-2xl font-semibold leading-snug tracking-tight text-white text-balance"
        style={{ textShadow: '0 1px 3px rgba(120, 53, 15, 0.35), 0 0 24px rgba(255, 255, 255, 0.35)' }}
      >
        <RecitedWords lines={METTA_SUTTA_COUPLETS[line].lines} pace={pace} wordOffset={wordOffset} isRunning={isRunning} />
      </p>
    </GlassCard>
  );
};
