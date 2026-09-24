// Number of interval bells that should have rung after `elapsed` seconds.
// Bells ring at every multiple of `interval`, but never at (or after) the end
// of the session - that moment belongs to the end bell.
export const countIntervalBellsDue = (elapsed, interval, duration) => {
  if (!interval || interval <= 0 || elapsed <= 0) return 0;

  const maxBells = Math.max(0, Math.floor((duration - 1) / interval));
  return Math.min(Math.floor(elapsed / interval), maxBells);
};
