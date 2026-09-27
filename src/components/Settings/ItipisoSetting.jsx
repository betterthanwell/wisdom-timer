import { Flower2 } from 'lucide-react';
import { ITIPISO_PACES } from '../../utils/settings';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';
import { ChoiceButton } from '../UI/ChoiceButton';

// Itipi so mode on/off, and how long each word takes
export const ItipisoSetting = ({ enabled, pace, onToggle, onPaceChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <SettingLabel icon={Flower2}>Itipi so mode</SettingLabel>
        <Switch checked={enabled} onChange={onToggle} label="Itipi so mode" />
      </div>
      {enabled && (
        <div className="pl-6 space-y-2">
          <p className="text-xs text-white/70">Itipi so.</p>
          <div role="group" aria-label="Itipi so pace" className="grid grid-cols-4 gap-2">
            {ITIPISO_PACES.map((option) => (
              <ChoiceButton
                key={option}
                selected={option === pace}
                onClick={() => onPaceChange(option)}
                aria-label={`${option} ${option === 1 ? 'second' : 'seconds'} per word`}
                className="py-1.5"
              >
                {option}s
              </ChoiceButton>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
