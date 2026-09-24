import { Infinity as InfinityIcon } from 'lucide-react';
import { Switch } from '../UI/Switch';

export const OpenEndedSetting = ({ enabled, onToggle, disabled = false }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <InfinityIcon className="w-4 h-4 text-white/70" />
          <span className="text-sm font-medium text-white">Open-ended sitting</span>
        </div>
        <Switch checked={enabled} onChange={onToggle} label="Open-ended sitting" disabled={disabled} />
      </div>
      {enabled && (
        <p className="pl-6 text-xs text-white/60">Counts up until you press Finish.</p>
      )}
    </div>
  );
};
