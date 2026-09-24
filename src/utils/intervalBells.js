// Number of interval bells that should have rung after `elapsed` seconds.
// The first bell rings at `firstAt` (default: one interval), then one every
// `interval`, but never at (or after) the end of the session - that moment
// belongs to the end bell.
export const countIntervalBellsDue = (elapsed, interval, duration, firstAt = interval) => {
  if (!interval || interval <= 0 || elapsed <= 0) return 0;
  if (elapsed < firstAt || duration - 1 < firstAt) return 0;

  const maxBells = Math.floor((duration - 1 - firstAt) / interval) + 1;
  return Math.min(Math.floor((elapsed - firstAt) / interval) + 1, maxBells);
};
