import { ChevronDown } from 'lucide-react';

// A whole number chosen from a list, min to max. A native <select>: iPhones
// show it as a wheel, Android as its own list, computers as a dropdown you
// can type into ("0", "5" picks 05) or scroll. Nothing is typed into a field,
// so nothing gets corrected halfway through typing.
export const NumberPicker = ({ value, min, max, onChange, label, pad = false, disabled = false, className = '' }) => (
  <span className="relative inline-flex">
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      disabled={disabled}
      className={`appearance-none cursor-pointer pl-2 pr-6 text-center tabular-nums bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-default disabled:opacity-50 ${className}`}
    >
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
        // The open list is drawn by the browser on a light background
        <option key={n} value={n} className="text-gray-900">
          {pad ? String(n).padStart(2, '0') : n}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/70" aria-hidden="true" />
  </span>
);
