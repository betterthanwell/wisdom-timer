import { Volume2, CloudRain, Waves, Trees, Radio, VolumeX } from 'lucide-react';
import { AMBIENT_SOUNDS } from '../../constants/audioSources';

const iconMap = {
  Cloud: CloudRain,
  Waves: Waves,
  Trees: Trees,
  Radio: Radio,
};

export const AmbientSoundSelector = ({
  selectedSound,
  onSoundSelect,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-white/70" />
        <span className="text-sm font-medium text-white">Ambient Sounds</span>
      </div>

      {/* Sound selection grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* None option */}
        <button
          onClick={() => onSoundSelect(null)}
          disabled={disabled}
          className={`p-3 rounded-lg border transition-all ${
            selectedSound === null
              ? 'bg-white/20 border-white/40'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center gap-1">
            <VolumeX className="w-5 h-5 text-white/80" />
            <span className="text-xs text-white/70">None</span>
          </div>
        </button>

        {/* Ambient sound options */}
        {AMBIENT_SOUNDS.map((sound) => {
          const Icon = iconMap[sound.icon] || Volume2;
          const isSelected = selectedSound === sound.id;

          return (
            <button
              key={sound.id}
              onClick={() => onSoundSelect(sound.id)}
              disabled={disabled}
              className={`p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-white/20 border-white/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center gap-1">
                <Icon className="w-5 h-5 text-white/80" />
                <span className="text-xs text-white/70">{sound.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
