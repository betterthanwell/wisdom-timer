import { Sunset } from 'lucide-react';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';

export const GentleEndingSetting = ({ enabled, onToggle }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <SettingLabel icon={Sunset}>Fade out in the last minute</SettingLabel>
      <Switch checked={enabled} onChange={onToggle} label="Gentle ending" />
    </div>
  );
};
