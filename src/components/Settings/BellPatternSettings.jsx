import { BellRing } from 'lucide-react';
import { Switch } from '../UI/Switch';

const BELLS = [
  { key: 'start', label: 'Start' },
  { key: 'interval', label: 'Interval' },
  { key: 'end', label: 'End' },
];

// How many times each bell rings: 1-3 strikes (e.g. three to begin and end).
// The choices can be tucked away with the switch; hiding them doesn't change
// how the bells ring.
export const BellPatternSettings = ({ strikes, onChange, shown, onShownChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-white/70" />
          <span className="text-sm font-medium text-white">Bell strikes</span>
        </div>
        <Switch checked={shown} onChange={onShownChange} label="Show bell strikes" />
      </div>
      {shown && (
        <div className="space-y-2 pl-6">
          {BELLS.map((bell) => (
            <div key={bell.key} role="group" aria-label={`${bell.label} bell strikes`} className="flex items-center gap-2">
              <span className="w-16 text-sm text-white/70">{bell.label}</span>
              {[1, 2, 3].map((count) => {
                const selected = strikes[bell.key] === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onChange(bell.key, count)}
                    aria-pressed={selected}
                    aria-label={`${bell.label} bell: ${count} ${count === 1 ? 'strike' : 'strikes'}`}
                    className={`w-10 py-1 rounded-lg border text-sm text-white transition-all ${
                      selected ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {count}×
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
