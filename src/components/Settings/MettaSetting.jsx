import { Heart } from 'lucide-react';
import { METTA_SECONDS } from '../../utils/settings';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';
import { ChoiceButton } from '../UI/ChoiceButton';

// Metta mode on/off, and how long each phrase shows
export const MettaSetting = ({ enabled, seconds, onToggle, onSecondsChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <SettingLabel icon={Heart}>Metta mode</SettingLabel>
        <Switch checked={enabled} onChange={onToggle} label="Metta mode" />
      </div>
      {enabled && (
        <div className="pl-6 space-y-2">
          <p className="text-xs text-white/70">Shows the loving-kindness phrases in turn while you sit.</p>
          <div role="group" aria-label="Metta pace" className="grid grid-cols-4 gap-2">
            {METTA_SECONDS.map((option) => (
              <ChoiceButton
                key={option}
                selected={option === seconds}
                onClick={() => onSecondsChange(option)}
                aria-label={`${option} seconds per phrase`}
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
