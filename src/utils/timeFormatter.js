// Format seconds to MM:SS
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format a timestamp as a wall-clock time, e.g. "07:45" (or "07:45 AM" in
// 12-hour locales). Uses the device's locale unless one is given.
export const formatClockTime = (timestamp, locale = undefined) =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(timestamp);
