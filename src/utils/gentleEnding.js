// Ambient volume level (0-1) for a gentle ending: full volume until the last
// minute, then an even fade to silence as the end bell arrives. Sessions
// shorter than two minutes fade over their last half instead.
export const gentleEndingLevel = (timeRemaining, duration) => {
  const fadeSeconds = Math.min(60, duration / 2);
  if (fadeSeconds <= 0) return 0;
  return Math.max(0, Math.min(1, timeRemaining / fadeSeconds));
};
