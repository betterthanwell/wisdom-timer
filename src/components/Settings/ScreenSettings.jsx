import { Smartphone, Info } from 'lucide-react';

export const ScreenSettings = ({
  keepScreenAwake,
  onKeepScreenAwakeChange,
  wakeLockSupported,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      {/* Keep Screen Awake Toggle */}
      {wakeLockSupported && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium text-white">Keep Screen Awake</span>
          </div>
          <button
            onClick={() => onKeepScreenAwakeChange(!keepScreenAwake)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              keepScreenAwake ? 'bg-white/30' : 'bg-white/10'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                keepScreenAwake ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {/* iOS Locked Screen Info */}
      <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
        <Info className="w-4 h-4 text-white/60 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-white/60 space-y-1">
          <p className="font-medium text-white/80">Locked Screen Audio</p>
          <p>
            For bells to play when your screen is locked, select an ambient sound or keep the timer in the foreground.
            The app uses background audio to ensure your meditation bell plays even with the screen off.
          </p>
          <p className="text-white/50">
            Tip: On iPhone, make sure Silent Mode is off for best results.
          </p>
        </div>
      </div>
    </div>
  );
};
