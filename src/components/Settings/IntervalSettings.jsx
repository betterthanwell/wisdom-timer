import { Bell } from 'lucide-react';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';
import { NumberPicker } from '../UI/NumberPicker';

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
          <label className="flex items-center gap-2 text-sm text-white/70">
            Hit the woodblock every
            <NumberPicker
              value={intervalMinutes}
              min={1}
              max={30}
              onChange={(minutes) => onIntervalChange(minutes * 60)}
              label="Interval in minutes"
              disabled={disabled}
              className="py-1"
            />
            minutes
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            Starting after
            <NumberPicker
              value={startMinutes}
              min={1}
              max={60}
              onChange={(minutes) => onStartChange(minutes * 60)}
              label="Starting after, in minutes"
              disabled={disabled}
              className="py-1"
            />
            minutes
          </label>
        </div>
      )}
    </div>
  );
};
