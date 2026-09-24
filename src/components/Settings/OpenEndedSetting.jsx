import { Infinity as InfinityIcon } from 'lucide-react';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';

export const OpenEndedSetting = ({ enabled, onToggle, disabled = false }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <SettingLabel icon={InfinityIcon}>Open-ended sitting</SettingLabel>
        <Switch checked={enabled} onChange={onToggle} label="Open-ended sitting" disabled={disabled} />
      </div>
      {enabled && (
        <p className="pl-6 text-xs text-white/70">Counts up until you press Finish.</p>
      )}
    </div>
  );
};
