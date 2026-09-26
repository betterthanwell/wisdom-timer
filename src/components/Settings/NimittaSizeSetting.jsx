import { Sun } from 'lucide-react';
import { SettingLabel } from '../UI/SettingLabel';

export const NIMITTA_SIZE_MIN = 0.5;
export const NIMITTA_SIZE_MAX = 2;

const MIN = Math.round(NIMITTA_SIZE_MIN * 100);
const MAX = Math.round(NIMITTA_SIZE_MAX * 100);

// How far the glow around the time reaches (1 = as designed). Only with
// ?debug, for trying sizes out on a device; not saved.
export const NimittaSizeSetting = ({ size, onChange }) => {
  const percent = Math.round(size * 100);
  const filled = ((percent - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="space-y-2">
      <SettingLabel icon={Sun}>Nimitta size (testing, not saved)</SettingLabel>
      <div className="pl-6 flex items-center gap-3">
        <input
          type="range"
          min={MIN}
          max={MAX}
          step="10"
          value={percent}
          onChange={(e) => onChange(parseInt(e.target.value) / 100)}
          aria-label="Nimitta size"
          className="flex-1 min-w-0 h-2 rounded-lg appearance-none cursor-pointer accent-white"
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,0.45) ${filled}%, rgba(255,255,255,0.12) ${filled}%)`,
          }}
        />
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/70">{percent}%</span>
      </div>
    </div>
  );
};
