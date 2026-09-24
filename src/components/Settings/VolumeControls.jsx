import { Bell, Volume2 } from 'lucide-react';

const VolumeSlider = ({ icon: Icon, label, value, onChange, disabled }) => {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 shrink-0 text-white/70" aria-hidden="true" />
      <span className="w-16 shrink-0 text-sm font-medium text-white">{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={percent}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        disabled={disabled}
        aria-label={`${label} volume`}
        className="flex-1 min-w-0 h-2 rounded-lg appearance-none cursor-pointer accent-white"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.45) ${percent}%, rgba(255,255,255,0.12) ${percent}%)`,
        }}
      />
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/70">{percent}%</span>
    </div>
  );
};

export const VolumeControls = ({
  bellVolume,
  ambientVolume,
  onBellVolumeChange,
  onAmbientVolumeChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <VolumeSlider icon={Bell} label="Bells" value={bellVolume} onChange={onBellVolumeChange} disabled={disabled} />
      <VolumeSlider icon={Volume2} label="Sound" value={ambientVolume} onChange={onAmbientVolumeChange} disabled={disabled} />
    </div>
  );
};
