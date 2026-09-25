import { Volume2, CloudRain, Waves, Trees, Radio, VolumeX, CloudOff } from 'lucide-react';
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

// For screen readers: what a sound's download status means
const STATUS_TEXT = {
  missing: 'Downloads when chosen',
  downloading: 'Downloading',
  failed: 'Download failed, choose it to try again',
};

// Ring around the icon showing download progress (0-1)
const ProgressRing = ({ progress }) => (
  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20" />
    <circle
      cx="14"
      cy="14"
      r="12.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      pathLength="100"
      strokeDasharray={`${progress * 100} 100`}
      className="text-white"
    />
  </svg>
);

// `selectedSound` is the sound playing with a session (null: none). Sounds
// not on the device yet show their download status from `downloads`.
export const AmbientSoundSelector = ({ selectedSound, downloads = {}, onSoundSelect, disabled = false }) => {
  return (
    <div className="space-y-2">
      <SettingLabel icon={Volume2} id="ambient-label">Ambient sound</SettingLabel>
      <div role="group" aria-labelledby="ambient-label" className="grid grid-cols-4 gap-2">
        {OPTIONS.map(({ id, name, Icon }) => {
          const { state, progress = 0 } = downloads[id] ?? {};
          const statusId = STATUS_TEXT[state] ? `ambient-status-${id}` : undefined;
          const StatusIcon = state === 'failed' ? CloudOff : Icon;
          return (
            <ChoiceButton
              key={name}
              selected={selectedSound === id}
              onClick={() => onSoundSelect(id)}
              disabled={disabled}
              aria-describedby={statusId}
              aria-busy={state === 'downloading' || undefined}
              className="flex flex-col items-center gap-1 px-1 py-2"
            >
              <span className="relative flex items-center justify-center w-7 h-7 -my-1">
                {state === 'downloading' && <ProgressRing progress={progress} />}
                <StatusIcon
                  className={`w-5 h-5 ${state === 'missing' || state === 'failed' ? 'text-white/50' : 'text-white/85'} ${
                    state === 'downloading' ? 'scale-75' : ''
                  }`}
                  aria-hidden="true"
                />
              </span>
              <span className="text-xs leading-tight text-white/80">{name}</span>
            </ChoiceButton>
          );
        })}
      </div>
      {/* Outside the buttons, so it isn't part of their names */}
      {OPTIONS.map(({ id }) => {
        const { state, progress = 0 } = downloads[id] ?? {};
        return (
          STATUS_TEXT[state] && (
            <span key={id} id={`ambient-status-${id}`} className="sr-only">
              {state === 'downloading' ? `${STATUS_TEXT[state]}, ${Math.round(progress * 100)}%` : STATUS_TEXT[state]}
            </span>
          )
        );
      })}
    </div>
  );
};
