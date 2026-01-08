import { Bell, Volume2 } from 'lucide-react';

export const VolumeControls = ({
  bellVolume,
  ambientVolume,
  onBellVolumeChange,
  onAmbientVolumeChange,
  disabled = false,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Bell Volume */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-white/70" />
          <span className="text-sm font-medium text-white">Bell Volume</span>
        </div>
        <div className="space-y-1">
          <label className="flex items-center justify-between text-xs text-white/70">
            <span>Volume</span>
            <span>{Math.round(bellVolume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={bellVolume * 100}
            onChange={(e) => onBellVolumeChange(parseInt(e.target.value) / 100)}
            onInput={(e) => onBellVolumeChange(parseInt(e.target.value) / 100)}
            disabled={disabled}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${bellVolume * 100}%, rgba(255,255,255,0.1) ${bellVolume * 100}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
        </div>
      </div>

      {/* Ambient Volume */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-white/70" />
          <span className="text-sm font-medium text-white">Ambient Volume</span>
        </div>
        <div className="space-y-1">
          <label className="flex items-center justify-between text-xs text-white/70">
            <span>Volume</span>
            <span>{Math.round(ambientVolume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={ambientVolume * 100}
            onChange={(e) => onAmbientVolumeChange(parseInt(e.target.value) / 100)}
            onInput={(e) => onAmbientVolumeChange(parseInt(e.target.value) / 100)}
            disabled={disabled}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${ambientVolume * 100}%, rgba(255,255,255,0.1) ${ambientVolume * 100}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
        </div>
      </div>
    </div>
  );
};
