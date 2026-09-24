// Format seconds to MM:SS
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format seconds to human-readable string (e.g., "5 minutes", "1 minute 30 seconds")
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) {
    return `${secs} second${secs !== 1 ? 's' : ''}`;
  }

  if (secs === 0) {
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  }

  return `${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
};

// Convert MM:SS string to seconds
export const parseTime = (timeString) => {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return (mins * 60) + secs;
  }
  return 0;
};

// Format a timestamp as a wall-clock time, e.g. "07:45" (or "07:45 AM" in
// 12-hour locales). Uses the device's locale unless one is given.
export const formatClockTime = (timestamp, locale = undefined) =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(timestamp);
