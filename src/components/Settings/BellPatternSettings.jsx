import { BellRing } from 'lucide-react';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';
import { ChoiceButton } from '../UI/ChoiceButton';

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
        <SettingLabel icon={BellRing}>Bell strikes</SettingLabel>
        <Switch checked={shown} onChange={onShownChange} label="Show bell strikes" />
      </div>
      {shown && (
        <div className="space-y-2 pl-6">
          {BELLS.map((bell) => (
            <div key={bell.key} role="group" aria-label={`${bell.label} bell strikes`} className="flex items-center gap-2">
              <span className="w-16 text-sm text-white/70">{bell.label}</span>
              {[1, 2, 3].map((count) => (
                <ChoiceButton
                  key={count}
                  selected={strikes[bell.key] === count}
                  onClick={() => onChange(bell.key, count)}
                  aria-label={`${bell.label} bell: ${count} ${count === 1 ? 'strike' : 'strikes'}`}
                  className="w-10 py-1"
                >
                  {count}×
                </ChoiceButton>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
