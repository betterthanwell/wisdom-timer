import { Bell } from 'lucide-react';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';
import { Stepper } from '../UI/Stepper';
import { minuteSteps } from '../../utils/minuteSteps';

const INTERVAL_STEPS = minuteSteps(30);
const START_STEPS = minuteSteps(60);

export const IntervalSettings = ({
  enabled,
  intervalDuration,
  intervalStart,
  onToggle,
  onIntervalChange,
  onStartChange,
  disabled = false,
}) => {
  const intervalMinutes = Math.floor(intervalDuration / 60);
  const startMinutes = Math.floor(intervalStart / 60);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <SettingLabel icon={Bell}>Interval Woodblock</SettingLabel>
        <Switch checked={enabled} onChange={onToggle} label="Interval woodblock" disabled={disabled} />
      </div>

      {enabled && (
        <div className="pl-6 space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm text-white/70">
            <span>Every</span>
            <Stepper
              value={intervalMinutes}
              steps={INTERVAL_STEPS}
              onChange={(minutes) => onIntervalChange(minutes * 60)}
              label="Woodblock interval"
              unit="min"
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-sm text-white/70">
            <span>Starting after</span>
            <Stepper
              value={startMinutes}
              steps={START_STEPS}
              onChange={(minutes) => onStartChange(minutes * 60)}
              label="Woodblock start"
              unit="min"
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
};
