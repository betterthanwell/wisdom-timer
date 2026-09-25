import { Play } from 'lucide-react';
import { formatTime } from '../../utils/timeFormatter';

// White letters outlined in black: deliberately not the page's soft style,
// so it's unmistakable that something outside the app stopped the session
const OUTLINED = { WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' };

// Shown in place of the time when something outside the app (iOS: a call,
// Siri, headphones unplugged) stopped a guided session. One big
// button - easy to hit with a thumb - carries on exactly where it stopped.
// An alert, so a screen reader announces it as soon as it appears.
export const InterruptedPause = ({ timeRemaining, onCarryOn }) => (
  <div data-testid="interrupted" role="alert" className="relative z-20 flex flex-col items-center gap-5 py-4 sm:py-8">
    <p className="text-6xl sm:text-7xl font-black tracking-wider text-white" style={OUTLINED}>
      PAUSED
    </p>
    <button
      type="button"
      onClick={onCarryOn}
      aria-label="Carry on"
      className="flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white text-black border-4 border-black shadow-2xl active:scale-95 transition-transform"
    >
      <Play className="w-20 h-20 translate-x-1.5" fill="currentColor" aria-hidden="true" />
    </button>
    <p className="max-w-xs text-center text-lg font-bold leading-snug text-white" style={{ ...OUTLINED, WebkitTextStroke: '1px #000' }}>
      Interrupted from outside the app. Tap to carry on where you were - <span>{formatTime(timeRemaining)}</span> to go.
    </p>
  </div>
);
