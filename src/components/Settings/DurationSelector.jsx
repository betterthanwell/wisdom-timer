import { useState, useEffect } from 'react';

export const DurationSelector = ({ duration, onChange, disabled = false }) => {
  const [minutes, setMinutes] = useState(Math.floor(duration / 60));
  const [seconds, setSeconds] = useState(duration % 60);

  useEffect(() => {
    setMinutes(Math.floor(duration / 60));
    setSeconds(duration % 60);
  }, [duration]);

  const handleMinutesChange = (e) => {
    const value = Math.max(0, Math.min(99, parseInt(e.target.value) || 0));
    setMinutes(value);
    onChange(value * 60 + seconds);
  };

  const handleSecondsChange = (e) => {
    const value = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
    setSeconds(value);
    onChange(minutes * 60 + value);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex flex-col items-center">
        <input
          type="number"
          min="0"
          max="99"
          value={minutes}
          onChange={handleMinutesChange}
          disabled={disabled}
          className="w-20 px-3 py-2 text-center text-xl font-medium bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
        />
        <span className="text-xs text-white/60 mt-1">minutes</span>
      </div>

      <span className="text-2xl text-white/70 mb-5">:</span>

      <div className="flex flex-col items-center">
        <input
          type="number"
          min="0"
          max="59"
          value={seconds}
          onChange={handleSecondsChange}
          disabled={disabled}
          className="w-20 px-3 py-2 text-center text-xl font-medium bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
        />
        <span className="text-xs text-white/60 mt-1">seconds</span>
      </div>
    </div>
  );
};
