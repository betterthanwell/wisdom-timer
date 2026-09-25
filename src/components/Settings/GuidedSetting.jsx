import { Headphones, CloudDownload, CloudOff, Check } from 'lucide-react';
import { AUDIO_SOURCES, GUIDED_SOURCE } from '../../constants/audioSources';
import { Switch } from '../UI/Switch';
import { SettingLabel } from '../UI/SettingLabel';
import { ChoiceButton } from '../UI/ChoiceButton';
import { ProgressRing } from '../UI/ProgressRing';

const TRACKS = Object.entries(AUDIO_SOURCES.guided).map(([id, track]) => ({ id, ...track }));

// For screen readers: what a recording's download status means
const STATUS_TEXT = {
  missing: 'Downloads when chosen',
  downloading: 'Downloading',
  failed: 'Download failed, choose it to try again',
};

// Guided meditation: a recording sets the session (start bell, the voice,
// the end bell when it finishes). Recordings download when chosen, like
// ambient sounds, and Start waits until the chosen one is on the device.
export const GuidedSetting = ({ enabled, track, downloads = {}, onToggle, onTrackSelect, disabled = false }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <SettingLabel icon={Headphones}>Guided meditation</SettingLabel>
        <Switch checked={enabled} onChange={onToggle} label="Guided meditation" disabled={disabled} />
      </div>
      {enabled && (
        <>
          <div role="group" aria-label="Guided meditations" className="grid grid-cols-2 gap-2">
            {TRACKS.map(({ id, name, length }) => {
              const { state, progress = 0 } = downloads[id] ?? {};
              const StatusIcon = state === 'failed' ? CloudOff : state === 'kept' ? Check : CloudDownload;
              return (
                <ChoiceButton
                  key={id}
                  selected={track === id}
                  onClick={() => onTrackSelect(id)}
                  disabled={disabled}
                  aria-describedby={STATUS_TEXT[state] ? `guided-status-${id}` : undefined}
                  aria-busy={state === 'downloading' || undefined}
                  className="flex items-center gap-2 px-2.5 py-2 text-left"
                >
                  <span className="relative flex shrink-0 items-center justify-center w-7 h-7 -my-1">
                    {state === 'downloading' && <ProgressRing progress={progress} />}
                    <StatusIcon
                      className={`w-4 h-4 ${state === 'kept' ? 'text-white/85' : 'text-white/50'} ${
                        state === 'downloading' ? 'scale-75' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="leading-tight">
                    <span className="block">{name}</span>
                    <span className="block text-xs text-white/70">{length}</span>
                  </span>
                </ChoiceButton>
              );
            })}
          </div>
          {/* Outside the buttons, so it isn't part of their names */}
          {TRACKS.map(({ id }) => {
            const { state, progress = 0 } = downloads[id] ?? {};
            return (
              STATUS_TEXT[state] && (
                <span key={id} id={`guided-status-${id}`} className="sr-only">
                  {state === 'downloading' ? `${STATUS_TEXT[state]}, ${Math.round(progress * 100)}%` : STATUS_TEXT[state]}
                </span>
              )
            );
          })}
          <p className="text-xs text-white/70">
            <a href={GUIDED_SOURCE.url} target="_blank" rel="noreferrer" className="underline decoration-white/40 hover:text-white">
              {/* The space keeps the link's name from running the lines together */}
              {GUIDED_SOURCE.credit[0]} <br />
              {GUIDED_SOURCE.credit[1]}
            </a>
          </p>
        </>
      )}
    </div>
  );
};
