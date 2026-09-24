import { Sunset } from 'lucide-react';
import { Switch } from '../UI/Switch';

export const GentleEndingSetting = ({ enabled, onToggle }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Sunset className="w-4 h-4 text-white/70" />
        <span className="text-sm font-medium text-white">Fade ambient sound over the last minute</span>
      </div>
      <Switch checked={enabled} onChange={onToggle} label="Gentle ending" />
    </div>
  );
};
