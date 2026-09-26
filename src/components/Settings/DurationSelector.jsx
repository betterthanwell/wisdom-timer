import { NumberPicker } from '../UI/NumberPicker';

const PICKER = 'py-1.5 text-lg font-medium';

export const DurationSelector = ({ duration, onChange, disabled = false }) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-white/70">
      <span>Custom</span>
      <NumberPicker
        value={minutes}
        min={0}
        max={99}
        pad
        onChange={(value) => onChange(value * 60 + seconds)}
        label="Minutes"
        disabled={disabled}
        className={PICKER}
      />
      <span>min</span>
      <NumberPicker
        value={seconds}
        min={0}
        max={59}
        pad
        onChange={(value) => onChange(minutes * 60 + value)}
        label="Seconds"
        disabled={disabled}
        className={PICKER}
      />
      <span>sec</span>
    </div>
  );
};
