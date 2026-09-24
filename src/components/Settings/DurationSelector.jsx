const inputClassName =
  'w-14 px-1 py-1.5 text-center text-lg font-medium tabular-nums bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50';

export const DurationSelector = ({ duration, onChange, disabled = false }) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  const handleMinutesChange = (e) => {
    const value = Math.max(0, Math.min(99, parseInt(e.target.value) || 0));
    onChange(value * 60 + seconds);
  };

  const handleSecondsChange = (e) => {
    const value = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
    onChange(minutes * 60 + value);
  };

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-white/70">
      <span>Custom</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="99"
        value={minutes}
        onChange={handleMinutesChange}
        aria-label="Minutes"
        disabled={disabled}
        className={inputClassName}
      />
      <span>min</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="59"
        value={seconds}
        onChange={handleSecondsChange}
        aria-label="Seconds"
        disabled={disabled}
        className={inputClassName}
      />
      <span>sec</span>
    </div>
  );
};
