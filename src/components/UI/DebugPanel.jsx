import { useSyncExternalStore } from 'react';
import { audioManager } from '../../utils/audioManager';
import { debugLog } from '../../utils/debugLog';
import { testingTools } from '../../utils/testingTools';

// ?debug (previews and local only): the audio state and the latest audio
// events, so an iPhone test run shows what happened without a cable
export const DebugPanel = () => {
  const entries = useSyncExternalStore(debugLog.subscribe, debugLog.entries);

  return (
    <div
      data-testid="debug-panel"
      className="fixed inset-x-2 bottom-2 z-[60] max-h-56 overflow-y-auto rounded-lg bg-black/85 p-2 font-mono text-[11px] leading-snug text-white select-text"
    >
      <div className="font-bold">
        audio: {audioManager.context?.state ?? 'none'} · speed ×{testingTools.speed}
      </div>
      {[...entries].reverse().map((entry) => (
        <div key={entry.id}>
          <span className="text-white/60">{entry.time}</span> {entry.message}
        </div>
      ))}
    </div>
  );
};
