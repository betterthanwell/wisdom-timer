import { Sun } from 'lucide-react';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';

export const KeepAwakeSetting = ({ enabled, onToggle }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <SettingLabel icon={Sun}>Keep screen awake</SettingLabel>
      <Switch checked={enabled} onChange={onToggle} label="Keep screen awake" />
    </div>
  );
};
