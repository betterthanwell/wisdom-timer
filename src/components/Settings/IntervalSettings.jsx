import { Bell } from 'lucide-react';
import { Switch } from '../UI/Switch';

export const IntervalSettings = ({
  enabled,
  intervalDuration,
  onToggle,
  onIntervalChange,
  disabled = false,
}) => {
  const intervalMinutes = Math.floor(intervalDuration / 60);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-white/70" />
          <span className="text-sm font-medium text-white">Interval Bells</span>
        </div>
        <Switch checked={enabled} onChange={onToggle} label="Interval bells" disabled={disabled} />
      </div>

      {enabled && (
        <div className="pl-6">
          <label className="flex items-center gap-2 text-sm text-white/70">
            Ring every
            <input
              type="number"
              min="1"
              max="30"
              value={intervalMinutes}
              onChange={(e) => onIntervalChange(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)) * 60)}
              aria-label="Interval in minutes"
              disabled={disabled}
              className="w-16 px-2 py-1 text-center bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
            />
            minutes
          </label>
        </div>
      )}
    </div>
  );
};
