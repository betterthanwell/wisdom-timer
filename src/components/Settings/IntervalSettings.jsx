import { Bell } from 'lucide-react';
import { Switch } from '../UI/Switch';

// Whole minutes between min and max (anything unreadable counts as min)
const clampMinutes = (text, min, max) => Math.max(min, Math.min(max, parseInt(text) || min));

const inputClassName =
  'w-16 px-2 py-1 text-center bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50';

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-white/70" />
          <span className="text-sm font-medium text-white">Interval Woodblock</span>
        </div>
        <Switch checked={enabled} onChange={onToggle} label="Interval woodblock" disabled={disabled} />
      </div>

      {enabled && (
        <div className="pl-6 space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/70">
            Hit the woodblock every
            <input
              type="number"
              min="1"
              max="30"
              value={intervalMinutes}
              onChange={(e) => onIntervalChange(clampMinutes(e.target.value, 1, 30) * 60)}
              aria-label="Interval in minutes"
              disabled={disabled}
              className={inputClassName}
            />
            minutes
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            Starting after
            <input
              type="number"
              min="1"
              max="60"
              value={startMinutes}
              onChange={(e) => onStartChange(clampMinutes(e.target.value, 1, 60) * 60)}
              aria-label="Starting after, in minutes"
              disabled={disabled}
              className={inputClassName}
            />
            minutes
          </label>
        </div>
      )}
    </div>
  );
};
