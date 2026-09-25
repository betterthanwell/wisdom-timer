// Metta (loving-kindness) phrases, from oneself outwards: the traditional
// order (Visuddhimagga) begins with oneself, then someone dear, and ends
// with all beings. The neutral person is left out to keep the cycle short.
export const METTA_PHRASES = [
  'May I be happy.',
  'May my loved ones be happy.',
  'May those I find difficult be happy.',
  'May all beings everywhere be happy.',
];

// Which phrase to show after `elapsed` seconds, showing each for `seconds`.
// `step` keeps counting across cycles (a new step = a new flash); `phrase`
// is the index into METTA_PHRASES.
export const mettaStep = (elapsed, seconds) => {
  if (!(seconds > 0) || !(elapsed > 0)) return { step: 0, phrase: 0 };
  const step = Math.floor(elapsed / seconds);
  return { step, phrase: step % METTA_PHRASES.length };
};
