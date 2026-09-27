// The sit in progress, kept for this tab (sessionStorage), so a reload - a
// pull to refresh, or the browser discarding the tab and loading it again -
// picks it up instead of losing it silently. A new tab starts fresh.
//
// { mode: 'timed' | 'openEnded' | 'guided', duration (s), and either
//   endsAt (ms, real time - Date.now() - so it means the same after a
//   reload, even with ?speed, whose clock starts over on every load) while
//   running, or
//   remaining (s) while paused }
const KEY = 'wisdomTimerSit';
const MODES = ['timed', 'openEnded', 'guided'];

const isSit = (sit) =>
  sit !== null &&
  typeof sit === 'object' &&
  MODES.includes(sit.mode) &&
  Number.isFinite(sit.duration) &&
  (Number.isFinite(sit.endsAt) || Number.isFinite(sit.remaining));

// Storage can be missing or refuse (private browsing): the sit just isn't kept
export const saveSit = (sit) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(sit));
  } catch {
    // not kept
  }
};

export const clearSit = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing kept
  }
};

export const loadSit = () => {
  try {
    const sit = JSON.parse(sessionStorage.getItem(KEY));
    return isSit(sit) ? sit : null;
  } catch {
    return null;
  }
};

// What a saved sit is `now` (real time): still running (to the same end),
// paused (with the same time left), or ended while the page was away. With
// ?speed, the real time left runs `speed` times faster in session time.
export const resumeSit = (sit, now, speed = 1) => {
  if (Number.isFinite(sit.endsAt)) {
    const remainingMs = (sit.endsAt - now) * speed;
    return remainingMs > 0 ? { running: true, remainingMs } : { endedAt: sit.endsAt };
  }
  return { running: false, remainingMs: sit.remaining * 1000 };
};
