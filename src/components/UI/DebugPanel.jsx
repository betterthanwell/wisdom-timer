import { useSyncExternalStore } from 'react';
import { audioManager } from '../../utils/audioManager';
import { debugLog } from '../../utils/debugLog';

// ?debug (previews and local only): the audio state and the latest audio
// events, so an iPhone test run shows what happened without a cable. Its own
// card at the end of the page, so it covers nothing; above the quiet screen's
// dim, so it stays readable while sitting.
export const DebugPanel = () => {
  const entries = useSyncExternalStore(debugLog.subscribe, debugLog.entries);

  return (
    <div
      data-testid="debug-panel"
      className="relative z-20 max-h-56 overflow-y-auto rounded-2xl bg-black/75 px-4 py-3 font-mono text-[11px] leading-snug text-white select-text"
    >
      <div className="font-bold">audio: {audioManager.context?.state ?? 'none'}</div>
      {[...entries].reverse().map((entry) => (
        <div key={entry.id}>
          <span className="text-white/60">{entry.time}</span> {entry.message}
        </div>
      ))}
    </div>
  );
};
