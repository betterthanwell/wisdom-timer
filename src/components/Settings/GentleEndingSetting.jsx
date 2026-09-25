import { Sunset } from 'lucide-react';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';

export const GentleEndingSetting = ({ enabled, onToggle }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <SettingLabel icon={Sunset}>Fade out ambience in the last minute</SettingLabel>
        <Switch checked={enabled} onChange={onToggle} label="Gentle ending" />
      </div>
      <p className="pl-6 text-xs text-white/70">Only the ambience fades, not the bells.</p>
    </div>
  );
};
