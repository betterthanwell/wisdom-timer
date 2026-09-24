import { Hourglass } from 'lucide-react';
import { SETTLE_SECONDS } from '../../utils/settings';
import { SettingLabel } from '../UI/SettingLabel';
import { ChoiceButton } from '../UI/ChoiceButton';

const label = (seconds) => (seconds === 0 ? 'Off' : seconds < 60 ? `${seconds}s` : `${seconds / 60}m`);

// How long to count down before the start bell of a new session
export const SettleSetting = ({ seconds, onChange, disabled = false }) => {
  return (
    <div className="space-y-2">
      <SettingLabel icon={Hourglass} id="settle-label">Settle in before the start bell</SettingLabel>
      <div role="group" aria-labelledby="settle-label" className="grid grid-cols-5 gap-2">
        {SETTLE_SECONDS.map((option) => (
          <ChoiceButton
            key={option}
            selected={option === seconds}
            onClick={() => onChange(option)}
            disabled={disabled}
            aria-label={option === 0 ? 'No settling in' : `Settle in for ${label(option)}`}
            className="py-1.5"
          >
            {label(option)}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
};
