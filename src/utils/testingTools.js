// Testing tools for previews and local development - never on the live site:
//   ?speed=60  session time runs 60x faster (a 2-minute session in 2 s)
//   ?debug     an on-screen panel with the audio state and what each bell did
const LIVE_HOSTS = ['wisdomtimer.app', 'www.wisdomtimer.app'];
const MAX_SPEED = 600;

export const readTestingTools = (url) => {
  if (LIVE_HOSTS.includes(url.hostname)) return { speed: 1, debug: false };

  const speed = Number(url.searchParams.get('speed'));
  return {
    speed: Number.isFinite(speed) && speed >= 1 && speed <= MAX_SPEED ? speed : 1,
    debug: url.searchParams.has('debug'),
  };
};

// The clock sessions are timed by: the real clock, or one running `speed`
// times faster. realDelay() turns a session-time wait into a real one (for
// setTimeout).
export const makeSessionClock = (speed) => {
  if (speed === 1) return { now: () => Date.now(), realDelay: (ms) => ms };

  const realStart = Date.now();
  return {
    now: () => realStart + (Date.now() - realStart) * speed,
    realDelay: (ms) => ms / speed,
  };
};

export const testingTools = typeof window === 'undefined' ? { speed: 1, debug: false } : readTestingTools(new URL(window.location.href));
export const sessionClock = makeSessionClock(testingTools.speed);
