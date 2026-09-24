import { Volume2, CloudRain, Waves, Trees, Radio, VolumeX } from 'lucide-react';
import { AMBIENT_SOUNDS } from '../../constants/audioSources';
import { SettingLabel } from '../UI/SettingLabel';
import { ChoiceButton } from '../UI/ChoiceButton';

const iconMap = {
  Cloud: CloudRain,
  Waves: Waves,
  Trees: Trees,
  Radio: Radio,
};

const OPTIONS = [{ id: null, name: 'None', Icon: VolumeX }].concat(
  AMBIENT_SOUNDS.map((sound) => ({ ...sound, Icon: iconMap[sound.icon] || Volume2 }))
);

export const AmbientSoundSelector = ({ selectedSound, onSoundSelect, disabled = false }) => {
  return (
    <div className="space-y-2">
      <SettingLabel icon={Volume2} id="ambient-label">Ambient sound</SettingLabel>
      <div role="group" aria-labelledby="ambient-label" className="grid grid-cols-4 gap-2">
        {OPTIONS.map(({ id, name, Icon }) => (
          <ChoiceButton
            key={name}
            selected={selectedSound === id}
            onClick={() => onSoundSelect(id)}
            disabled={disabled}
            className="flex flex-col items-center gap-1 px-1 py-2"
          >
            <Icon className="w-5 h-5 text-white/85" aria-hidden="true" />
            <span className="text-xs leading-tight text-white/80">{name}</span>
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
};
