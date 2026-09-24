import { Hourglass } from 'lucide-react';
import { SETTLE_SECONDS } from '../../utils/settings';

const label = (seconds) => (seconds === 0 ? 'Off' : seconds < 60 ? `${seconds}s` : `${seconds / 60}m`);

// How long to count down before the start bell of a new session
export const SettleSetting = ({ seconds, onChange, disabled = false }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Hourglass className="w-4 h-4 text-white/70" />
        <span id="settle-label" className="text-sm font-medium text-white">
          Settle in before the start bell
        </span>
      </div>
      <div role="group" aria-labelledby="settle-label" className="grid grid-cols-5 gap-2">
        {SETTLE_SECONDS.map((option) => {
          const selected = option === seconds;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              disabled={disabled}
              aria-pressed={selected}
              aria-label={option === 0 ? 'No settling in' : `Settle in for ${label(option)}`}
              className={`py-1.5 rounded-lg border text-sm text-white transition-all ${
                selected ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/10'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
