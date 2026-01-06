import { Bell } from 'lucide-react';

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
        <button
          onClick={() => onToggle(!enabled)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-white/30' : 'bg-white/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
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
              onChange={(e) => onIntervalChange(Math.max(1, parseInt(e.target.value) || 1) * 60)}
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
