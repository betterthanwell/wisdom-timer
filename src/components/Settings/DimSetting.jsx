import { Moon } from 'lucide-react';
import { DIM_LEVEL_MAX, DIM_LEVEL_MIN } from '../../utils/settings';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';

const MIN = Math.round(DIM_LEVEL_MIN * 100);
const MAX = Math.round(DIM_LEVEL_MAX * 100);

// Dimming the page while sitting on/off, and how dark
export const DimSetting = ({ enabled, level, onToggle, onLevelChange }) => {
  const percent = Math.round(level * 100);
  const filled = ((percent - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <SettingLabel icon={Moon}>Dim the screen while sitting</SettingLabel>
        <Switch checked={enabled} onChange={onToggle} label="Dim the screen" />
      </div>
      {enabled && (
        <div className="pl-6 flex items-center gap-3">
          <input
            type="range"
            min={MIN}
            max={MAX}
            step="5"
            value={percent}
            onChange={(e) => onLevelChange(parseInt(e.target.value) / 100)}
            aria-label="Dimming level"
            className="flex-1 min-w-0 h-2 rounded-lg appearance-none cursor-pointer accent-white"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.45) ${filled}%, rgba(255,255,255,0.12) ${filled}%)`,
            }}
          />
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/70">{percent}%</span>
        </div>
      )}
    </div>
  );
};
