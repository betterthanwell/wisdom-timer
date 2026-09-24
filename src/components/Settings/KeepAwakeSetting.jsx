import { Sun } from 'lucide-react';
import { Switch } from '../UI/Switch';

export const KeepAwakeSetting = ({ enabled, onToggle }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Sun className="w-4 h-4 text-white/70" />
        <span className="text-sm font-medium text-white">Keep screen awake during sessions</span>
      </div>
      <Switch checked={enabled} onChange={onToggle} label="Keep screen awake" />
    </div>
  );
};
