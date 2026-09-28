import { Bell, BellOff, Headphones, Volume2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { SettingLabel } from '../UI/SettingLabel';

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
  onTestBell,
  onEndTest,
  testBellDisabled = false,
  guided = false,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <SettingLabel icon={Volume2}>Sound volume</SettingLabel>
      <VolumeSlider icon={Bell} label="Bells" value={bellVolume} onChange={onBellVolumeChange} disabled={disabled} />
      {/* The guided voice plays through the ambient channel, so one slider
          serves both; its name says which one you'll hear */}
      <VolumeSlider
        icon={guided ? Headphones : Volume2}
        label={guided ? 'Voice' : 'Ambient'}
        value={ambientVolume}
        onChange={onAmbientVolumeChange}
        disabled={disabled}
      />
      {/* A sound check before a sit: is the end bell loud enough, and coming
          out of the right speaker (not someone's earbuds)? The bell rings for
          over half a minute, so End test (at the end of the line) stops it.
          Phones get the note on a line of its own, so the buttons fit. */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onTestBell} disabled={testBellDisabled} className="shrink-0 whitespace-nowrap">
            <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
            Test bell
          </Button>
          <span className="hidden sm:inline text-xs text-white/70">The end bell, at this volume</span>
          <Button variant="secondary" size="sm" onClick={onEndTest} disabled={testBellDisabled} className="ml-auto shrink-0 whitespace-nowrap">
            <BellOff className="w-4 h-4 mr-2" aria-hidden="true" />
            End test
          </Button>
        </div>
        <p className="sm:hidden text-xs text-white/70">The end bell, at this volume</p>
      </div>
    </div>
  );
};
