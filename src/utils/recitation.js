// Shared by the recitation modes (Itipi so, Metta Sutta): a text shown one
// entry (a line, a couplet) at a time, each word lit in turn, paced by the
// time sat.

// A line's words. A token with no letters (a dash) stays with the word
// before it, so it takes no beat of its own.
export const splitWords = (text) =>
  text.split(/\s+/).reduce((words, token) => {
    if (words.length > 0 && !/\p{L}/u.test(token)) words[words.length - 1] += ` ${token}`;
    else words.push(token);
    return words;
  }, []);

// What to show after `elapsed` seconds, at `pace` seconds a word, for entries
// lasting `units` words each (their words and any rest after them). Each entry
// is rounded up to whole seconds: the time sat moves in seconds, so a line
// can't change in between. `step` keeps counting across cycles (a new step = a
// new entry); `line` is the entry's index; `wordOffset` is how many seconds
// into it we are (past its last word during a rest, when it stays on screen).
export const recitationStep = (units, elapsed, pace) => {
  if (!(pace > 0) || !(elapsed > 0)) return { step: 0, line: 0, wordOffset: 0 };
  const seconds = units.map((count) => Math.ceil(count * pace));
  const cycleSeconds = seconds.reduce((sum, length) => sum + length, 0);
  const cycle = Math.floor(elapsed / cycleSeconds);
  let into = elapsed - cycle * cycleSeconds;
  for (const [line, length] of seconds.entries()) {
    if (into < length) return { step: cycle * seconds.length + line, line, wordOffset: into };
    into -= length;
  }
  return { step: (cycle + 1) * seconds.length, line: 0, wordOffset: 0 }; // rounding at a cycle's end
};
