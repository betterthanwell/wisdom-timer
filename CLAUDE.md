# CLAUDE.md - AI Assistant Guide for Wisdom Timer

## Project Overview

Wisdom Timer is a meditation timer web app (React 19, Vite 8, Tailwind 4): bells at start, at intervals and at the end, looping ambient sounds, the time as a breathing glow (nimitta) above glass-morphism cards on a warm gradient, and an "enlightenment burst" animation on completion. Deployed on Vercel.

**Live:** https://wisdomtimer.app/

## Quick Commands

```bash
npm install          # Install dependencies (Node 22.12+; 24 LTS recommended)
npm run dev          # Dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Serve the production build
npm run lint         # ESLint
npm test             # Vitest, once (~9 s)
npm run test:watch   # Vitest, watch mode
npm run test:e2e     # Playwright: builds, then Chromium / WebKit / iPhone profile
```

## Project Structure

```
├── src/
│   ├── App.jsx                  # Session flow, keyboard shortcuts, layout (default export)
│   ├── App.*.test.jsx           # Component tests: whole app, audioManager mocked (session, settle, modes, screen)
│   ├── test/                    # appTestUtils.jsx (renderApp, click, …), audioManagerMock.js
│   ├── main.jsx                 # Entry point (StrictMode); registers the service worker once bells load
│   ├── sw.js                    # Service worker source (offline use) - emitted as /sw.js by vite.config.js
│   ├── registerServiceWorker.js # Registers /sw.js (production builds only)
│   ├── index.css                # Global styles, .glass-card(-strong), keyframes, reduced motion
│   ├── components/
│   │   ├── Timer/               # TimerDisplay (time, status, "Session N", burst), CircularProgress (glow + progress trail),
│   │   │                        # TimerControls (Start/Pause|Cancel/Finish/Reset), MettaCard
│   │   ├── Settings/            # PresetButtons, DurationSelector, IntervalSettings,
│   │   │                        # AmbientSoundSelector (+ iconMap), VolumeControls, KeepAwakeSetting, SettleSetting, BellPatternSettings, GentleEndingSetting, OpenEndedSetting, MettaSetting
│   │   └── UI/                  # GlassCard, Button (`round` for circles), Switch (on/off toggle with accessible name),
│   │                            # SettingLabel (icon + setting name), ChoiceButton (option with aria-pressed)
│   ├── hooks/
│   │   ├── useTimer.js          # Countdown from the clock, pause/resume, interval bells, wake-ups
│   │   ├── useAudio.js          # React wrapper around the audioManager singleton
│   │   ├── useSessionCounter.js # Sessions completed today (memory only, resets daily)
│   │   ├── useWakeLock.js       # Keeps the screen on (Screen Wake Lock API) while active
│   │   ├── useSettleCountdown.js # Settling-in countdown before a new session
│   │   ├── useAmbientDownloads.js # Each ambient sound's download status (useSyncExternalStore)
│   │   └── useLocalStorage.js   # Persisted state
│   ├── context/
│   │   ├── TimerContext.jsx     # TimerProvider: settings reducer + saving to localStorage
│   │   └── useTimerContext.js   # Context object + useTimerContext hook (own file for fast refresh)
│   ├── utils/
│   │   ├── audioManager.js      # AudioManager class + singleton: bells, ambient, fades, volume
│   │   ├── ambientDownloads.js  # Downloads ambient sounds when chosen, keeps them in Cache Storage
│   │   ├── intervalBells.js     # countIntervalBellsDue() - pure bell scheduling
│   │   ├── gentleEnding.js      # gentleEndingLevel() - ambient level over the last minute
│   │   ├── metta.js             # METTA_PHRASES + mettaStep() - which phrase shows when
│   │   ├── settings.js          # sanitizeSettings() - validates saved settings
│   │   └── timeFormatter.js     # formatTime (MM:SS) etc.
│   └── constants/
│       └── audioSources.js      # AUDIO_SOURCES (paths) + AMBIENT_SOUNDS (buttons)
├── e2e/                         # Playwright: session.spec.js, offline.spec.js, sounds.js (sound recorder)
├── public/audio/bells|ambient/  # Sound files (see Audio below)
├── public/manifest.webmanifest  # Web app manifest (install to home screen) + public/icons/
├── .github/workflows/           # ci.yml (lint, test, build), e2e.yml (Playwright)
├── index.html                   # HTML shell + CSP meta tags
├── vercel.json                  # HTTP security headers (the effective ones)
├── vite.config.js               # Vite + Vitest config; serviceWorker() plugin builds /sw.js
├── playwright.config.js         # Playwright config (vite preview on :4173)
├── eslint.config.js             # Flat config; Node globals for Playwright files
├── postcss.config.js            # @tailwindcss/postcss
└── LICENSE                      # MIT
```

## Session Behavior (decided by the owner)

The owner works out the desired behavior by live-testing, so these can change - but don't "fix" them without asking:

- **Start bell rings on every start, including resume** after a pause.
- **Duration (presets + custom) is locked while running and while paused**, greyed out; Reset unlocks it.
- **Interval bell settings**: locked while running, usable while paused (left open for now).
- **Interval woodblock** (the UI's name for interval bells): "Hit the woodblock every N minutes" (`intervalDuration`, 1-30 min, default 10) and "Starting after N minutes" (`intervalStart`, 1-60 min, default 5) - the first knock comes at the start time, then every interval (default: 5, 15, 25 …). Code and settings keys still say "interval bell".
- **Volume sliders** are always usable.
- **Ambient sound choice** is always usable: *None* stops the sound immediately; another sound switches right away while running, or starts on resume while paused.
- **Ambient sounds download when chosen** (7-25 MB each; nothing up front, so Start is ready within moments), with a progress ring on the button, and are then kept on the device for good (offline too). A sound plays only once it's kept: until then the selector shows *None* - also for a saved choice at page load, which downloads once the bells have loaded and then shows as selected. The choice itself stays saved. A download finishing mid-session starts the sound if it's still the choice (chosen while running: primed in the tap for iOS, and the previous sound stops). A failed download (offline) shows a crossed-out cloud; choosing it again retries.
- **Play after a completed session starts a new full session** (no Reset needed).
- **"Session N"** shows the session you're on today: completed count + 1, or the just-completed number while "Complete" shows (settling in for the next already shows the next). Memory only; starts over on reload and on a new day. Resets don't count.
- Start is disabled for a 0:00 duration.
- **"Ends at HH:MM"** shows under the timer only while running (hidden when paused, since the end moves); locale time format via `formatClockTime()`.
- **Layout**: title, (metta mode, in a session) the phrase card, then the time with no card around it - a radiant glow (nimitta) - then the controls on their own card, then the settings card. The glow's layers reach well past the ring (the page clips them sideways, `overflow-x-clip`) and fade to nothing; there's no ring track, only the progress arc as a trail of light (hidden at 0). It **breathes** - 4 s swelling, 4 s settling (`nimittaBreath`, scale 0.95-1.05, opacity 0.8-1) - only while running or settling in; paused, Ready and Complete hold it still where it is (`animation-play-state`), and there's no animation with reduced motion. The digits themselves stay steady.
- **Quiet screen**: while running, the settings card and keyboard hint are hidden and the page dims (`quiet-dim` overlay) - all but the time and its glow, which sit above the dim (`z-20`) and keep shining; "Show settings" (`aria-expanded`) reveals them and lifts the dim for that run. Paused/stopped shows everything; every start begins quiet again.
- **Settling in** (`settleSeconds`: 0/10/20/30/60, default 0 = off; the tap that begins it primes the chosen ambient sound - `audioManager.primeAmbient()`, muted play + pause - since iOS won't let the countdown's timer start an `<audio>` element otherwise): only before a *new* session (from Ready or after completion), never on resume. Silent countdown ("Settling in…"), then the normal start. Counts as in-session: quiet screen, wake lock, duration locked. The main button becomes **Cancel**; Cancel, Space and Reset return to Ready. On completion it calls the *latest* `startTimer` via a ref, so changes made while settling (e.g. ambient sound) apply.
- **Bell patterns**: `startStrikes`, `intervalStrikes`, `endStrikes` (1-3, default 1). Strikes are 5 s apart for start/end bowls, 2 s for the interval woodblock (`BELL_STRIKE_SPACING_MS`). Reset and starting a new session (e.g. Play right after the end bell) cancel strikes not yet rung; pause and resume don't. The "Bell strikes" section is always shown (whether interval bells are on or off); its switch (`showBellStrikes`, default off, saved) shows/hides the 1×/2×/3× choices. Hiding is UI only: saved strike counts - including start/end - keep applying.
- **Gentle ending** (`gentleEnding`, default on): while running, the ambient level follows `gentleEndingLevel()` - full until the last minute (or the last half of sessions under 2 min), then linearly to 0. Applied as `audioManager.setAmbientLevel()`, a multiplier separate from the volume slider; back to 1 whenever it doesn't apply.
- **Metta mode** (`mettaMode`, default off; `mettaSeconds` 5/10/20/30, default 10): while a session is running or paused, a separate `MettaCard` above the timer's glow shows one of the four `METTA_PHRASES` (oneself → loved ones → those I find difficult → all beings everywhere), then back to the first. Which phrase is derived from the time sat (`mettaStep()`), so pause holds it and resume carries on. Each phrase fades in, holds and fades out over its time (`mettaFlash` keyframes, frozen while paused; no animation with reduced motion). Hidden when Ready, settling in and after Reset. The card has a fixed height so the timer doesn't jump between one- and three-line phrases.
- **Open-ended sitting** (`openEnded`, default off): the timer runs as a countdown from 24 h (`OPEN_ENDED_SECONDS` in `App.jsx`) but displays the time sat (counting up); no progress ring, "Ends at" or gentle ending. **Finish** (`useTimer.finish()`) completes early - end bell, burst, session counted - and keeps the time sat on screen; Play then starts from 00:00. Presets/custom duration are greyed out while it's on; the switch itself is locked during a session.
- **Keep screen awake** (default on): a wake lock is held only while the timer is *running* (or settling in), not while paused. The toggle is hidden where the Wake Lock API isn't supported.
- Product direction: functional meditation features only - no streaks, stats, social sharing or similar engagement features.

## Architecture

### State
- **TimerContext** - `useReducer` for settings: `duration`, `presetDurations`, `intervalBellsEnabled`, `intervalDuration`, `intervalStart`, `selectedAmbient`, `ambientVolume`, `bellVolume`, `keepScreenAwake`. One generic `SET_SETTING` action (`{ key, value }`); named action functions (`setDuration`, `setKeepScreenAwake`, …) wrap it.
- Saved settings (`localStorage` key `wisdomTimerSettings`) seed the reducer's initial state through `sanitizeSettings()`, which keeps only valid values for known keys and uses defaults otherwise. Saving uses `pickSavedSettings()`: **every setting with a validator in `utils/settings.js` is saved, and nothing else.**
- Session state (running, paused, complete, time left) lives in `useTimer`, not the context.

### Timer (`useTimer`)
- Time left is computed from `expectedEndTimeRef` and `Date.now()`, never by decrementing, so it doesn't drift.
- Returns `timeRemaining`, `isRunning`, `isPaused`, `isComplete`, `endsAt` (end timestamp while running, else `null`), `progress`, `duration`, and `start`, `pause`, `reset`, `updateDuration`.
- A 100ms `setInterval` updates the display. Background tabs throttle it heavily (Chrome: down to once a minute), so the hook also schedules one-off `setTimeout` wake-ups at the end time and at each interval-bell time, and re-checks on `visibilitychange`. A `finished` guard prevents completing twice.
- `pause()` takes the time left from the clock, not the (possibly stale) displayed value.
- `start()` after completion begins a new full session. `finish()` completes a running or paused session early (open-ended sitting).
- Background wake-ups are only scheduled up to 6 hours ahead (`WAKE_UP_HORIZON_MS`), so a 24 h open-ended session with 1-minute bells doesn't create ~1,400 timeouts.
- Interval bells: `useTimer`'s 4th argument is `{ interval, firstAt, callback }` or `null`. `countIntervalBellsDue(elapsed, interval, duration, firstAt)` says how many bells are due - first at `firstAt` (default: one interval), then every `interval`, never at the end; the hook rings when the count goes up, so skipped ticks ring once. `start()` counts already-due bells as rung, so resuming doesn't ring a catch-up bell.

### Audio (`audioManager`)
- Singleton `AudioManager`; the class is also exported so tests can create isolated instances.
- `init()` is idempotent (React StrictMode mounts twice in dev) and delegates to `loadSounds()`: bells load first (waiting at most 2s in total, `BELL_LOAD_WAIT_MS`), then the ambient element is created. "Loading sounds…" shows and Start stays disabled until it's done.
- **Bells play through Web Audio** where available: `loadBell()` downloads and decodes each bell once (`bellBuffers`), so bells ring without a network; all bells go through one gain node (`bellGain` = bell volume, which iOS respects). `navigator.audioSession.type = 'playback'` (iOS) keeps the silent switch from muting them.
- **`unlock()` must be called during a tap or key press** - `App`'s `handleStart` does, for every Start/Space (also before settling in). iOS won't let sound start from a timer unless audio was unlocked by a gesture; on real iPhones, fresh `<audio>` elements started by timers stayed silent (#38, reverted in #41). It resumes the context (`resumeWebAudio()`, remembered in `resuming` so bells join it instead of asking again outside the tap - Safari may refuse that) and starts a silent buffer (older iOS).
- `strikeBell()` uses Web Audio once the bell is decoded and `unlock()` has run; if the context isn't running (still resuming, or `interrupted` - iOS: a call, another app) it waits up to 1s (`AUDIO_RESUME_WAIT_MS`) for it, else rings on an `<audio>` element rather than late or never. Without Web Audio, before decoding or before the first tap, bells play on a fresh `Audio` element each (overlap allowed; `cloneNode()` didn't reliably keep volume), tracked in `ringingBells` so volume changes reach them.
- Ambient: one looping element. The first `unlock()` routes it through Web Audio (`routeAmbientThroughWebAudio()`: media element source → `ambientGain` → speakers, element volume left at 1), so the slider, fades and gentle ending work on iOS; `ambientOutput()`/`setAmbientOutput()` use the gain once routed, the element's volume before (or without Web Audio). Once routed, its sound needs the audio context running (`playAmbient()` asks it to resume). `fade()` runs a fixed 20 steps over 500ms and always finishes, even where the browser ignores `volume` (iOS); the fade-in reads the target volume every step.
- `playAmbient(id)`: resumes if `id` is the current (paused) sound, otherwise switches. `currentAmbient` is set before `play()` and cleared as soon as a stop begins, so stopping while starting stays stopped.
- `playBell(type, strikes)` rings now and schedules later strikes (`pendingStrikes`); `cancelPendingBells()` drops the ones not yet rung. Each strike reads the current bell volume.
- `cleanup()` stops all playback (and pending strikes) but keeps loaded sounds.
- Sound files: bells are AAC in an MP4 container despite the `.mp3` names (browsers sniff content). Ambient files are long real recordings (10-36 min).

### Offline (service worker)
- `src/sw.js` is not bundled: the `serviceWorker()` plugin in `vite.config.js` emits it as `/sw.js` in production builds, prefixed with `VERSION` (a hash of the worker, the page, the built JS/CSS and `OFFLINE_PUBLIC_FILES`) and `PRECACHE` (`/`, the built files, favicon, manifest, icons, bells). The plugin runs `enforce: 'post'` so `index.html` is in the bundle, and fails the build if it isn't.
- Install caches `PRECACHE` in `wisdom-timer-<VERSION>` and calls `skipWaiting()`; activate deletes older `wisdom-timer-*` caches. Fetch: page loads and `PRECACHE` paths are served from the cache, kept ambient sounds from `AMBIENT_CACHE` (below), everything else from the network. Range requests for kept files (how `<audio>` elements load) get the requested part of the cached file as a 206 (`partOf()`; Safari won't play a full response to one), so bells that fall back to `<audio>` also ring offline.
- So after a deploy, the first load still shows the kept version while the new worker installs and takes over; the next load is new. `vercel.json` serves `/sw.js` with `Cache-Control: no-cache` so updates are found.
- Registered only in production builds (`import.meta.env.PROD`), after `audioManager.init()`, so its downloads don't compete with the bells on a first visit (by then they're revalidations).
- Kill switch if a bad worker ever ships: deploy a `sw.js` that deletes the `wisdom-timer-*` caches and calls `self.registration.unregister()`.
- Ambient sounds: `ambientDownloads` stores them in the `AMBIENT_CACHE` cache (`constants/audioSources.js`, injected into the worker with `AMBIENT_PATHS`), which isn't versioned or deleted on deploys; the worker plays them from there (Range → 206), else the network. Rename the cache if an ambient file changes. Without Cache Storage every sound counts as kept and streams as before.

### Known platform limits
- iOS pauses JavaScript when the screen locks, so no timer runs until unlock; bells can't ring while locked.
- iOS ignores `HTMLMediaElement.volume` (confirmed on an iPhone: gentle ending didn't fade). Bells and the ambient sound now go through Web Audio gains.
- Locked screen: pre-scheduling bells in Web Audio is the remaining idea. Old attempt: branch `claude/locked-screen-audio-6Q8xo` (PR #7) - keep it.

### Security headers
`vercel.json` sets the real HTTP headers: CSP (incl. `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy. `index.html` repeats CSP and others as `<meta>` tags, but browsers ignore `frame-ancestors` and `X-Frame-Options` in meta tags - clickjacking protection comes from `vercel.json`. Keep both CSPs in sync; the CSP allows only same-origin scripts and media. No `X-XSS-Protection` (deprecated; the CSP covers it) or `interest-cohort` (FLoC is gone; Chrome warns about it).

Caching: `/assets/*` (content-hashed build files) is `immutable` for a year; `/sw.js` is `no-cache`; everything else uses Vercel's default (revalidate).

### Accessibility
- `prefers-reduced-motion` disables animations.
- Icon-only buttons and unlabeled inputs have `aria-label`s (Start/Pause/Reset, Minutes, Seconds, "Interval in minutes", "Starting after, in minutes"); the "Interval woodblock" toggle is `role="switch"` with `aria-checked`. Tests rely on these names.
- Keyboard: Space start/pause, R reset. Ignored while typing in inputs, when Cmd/Ctrl/Alt is held (browser shortcuts like Cmd+R stay working), for key repeat (held down), and until the sounds have loaded (like the Start button). Space on a button reached with Tab presses that button; after a click or tap (`pointerdown`) it stays Start/Pause - `:focus-visible` can't tell them apart, since Chromium makes a clicked button focus-visible once a key is pressed. The hint under the settings (`data-testid="keyboard-hint"`) only shows where the main pointer is fine (`pointer-fine:` - mouse/trackpad), not on touch screens.
- Volume sliders are named "Bells volume" / "Sound volume"; choice buttons (settle time, strikes, presets, ambient sound) expose selection with `aria-pressed`.

## Code Conventions

- Components PascalCase `.jsx`; hooks `useX.js`; utils/constants camelCase.
- Functional components, props destructured in the signature, named exports (except `App`).
- Tailwind utility classes; custom CSS only in `index.css` (glass cards, keyframes). Inline styles for complex values (shadows, radial gradients).
- **Base CSS goes in `@layer base`.** Tailwind 4 puts utilities in cascade layers, and unlayered CSS beats any layer: a bare `* { padding: 0 }` once silently wiped out every `p-*`/`m-*`/`space-y-*` in the app. Tailwind's preflight already resets margins and box-sizing.
- Give a button one rounding class (`Button`'s `round` prop): conflicting ones like `rounded-xl rounded-full` resolve by stylesheet order, not class order.
- Settings rows: `SettingLabel` for the heading, `Switch` for on/off, `ChoiceButton` for options. The settings card is grouped into `<section>`s (duration, bells, sound, screen) divided by lines.
- Global settings via context actions; local UI state with `useState`; refs for values that mustn't re-render.
- Handlers passed to `useTimer` or used in effects are wrapped in `useCallback` - `useTimer`'s timer effect depends on `onComplete`, so an unstable callback would restart it every render.
- Lint must stay at zero errors and zero warnings (react-hooks rules include `set-state-in-effect` and exhaustive deps).

## Adding Features

### New ambient sound
1. Add the file to `public/audio/ambient/`.
2. In `src/constants/audioSources.js`, add it to **both** `AUDIO_SOURCES.ambient` (what plays; also what saved settings are validated against) and `AMBIENT_SOUNDS` (the buttons).
3. Add its icon to `iconMap` in `AmbientSoundSelector.jsx` (otherwise it falls back to a speaker icon).

### New bell sound
1. Add the file to `public/audio/bells/`.
2. Update `AUDIO_SOURCES.bells`, and the `bells` object in `AudioManager` if it's a new bell type.

### Background colors
The gradients are Tailwind arbitrary-value classes in `App.jsx` (`from-[#FDE68A] to-[#F97316]`, and a brighter one after completion).

### New setting
1. Add the default to `initialState` in `TimerContext.jsx`, and an action function that calls `setSetting('key', value)`.
2. Add a validator in `src/utils/settings.js` - that alone makes it saved and restored (unvalidated keys are neither).
3. Create the settings component (with an accessible name; use `UI/Switch` for on/off) and wire it in `App.jsx`.

## Testing

- **Vitest + jsdom + Testing Library**, configured in the `test` block of `vite.config.js`; only `src/**/*.test.{js,jsx}` is included.
- Tests live next to the code: `foo.js` → `foo.test.js`.
- Prefer pure functions (like `countIntervalBellsDue`, `sanitizeSettings`) and unit-test them.
- Hook tests: `renderHook` + `vi.useFakeTimers()`. Advance time in 1-second `act()` steps so React re-renders between ticks (one big `advanceTimersByTime` batches the updates and skips effects). Background throttling is simulated by stubbing `setInterval` out entirely.
- `audioManager.test.js` uses a `FakeAudio` class via `vi.stubGlobal('Audio', …)`, plus `FixedVolumeAudio` that ignores volume like iOS.
- `App.*.test.jsx` render `<App />` with `audioManager` replaced by spies (`vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'))` in each file) and find controls by accessible name; shared helpers and `setUpAppTests()` are in `src/test/appTestUtils.jsx`. They're split into several files so Vitest runs them in parallel (one file took ~14 s of a 17 s run); keep each under ~5 s. Sessions run on the fake clock (`completeOneSecondSession()`), not in real time.
- Pure logic tests start with `// @vitest-environment node` (no jsdom to set up).
- Vitest globals are off, so Testing Library doesn't auto-clean: call `cleanup()` in `afterEach` (`setUpAppTests()` does).
- While iterating, run just the affected test file (`npx vitest run src/App.settle.test.jsx`) and e2e spec in Chromium (`npx playwright test -g "…" --project=chromium`, ~5-12 s); the full matrix once at the end, and CI on the PR.
- **Playwright** (`e2e/`): the production build in Chromium, WebKit and an iPhone 15 profile. First time: `npx playwright install chromium webkit`.
  - The page clock is faked **and frozen** (`clock.install()` then `clock.pauseAt()`); an unfrozen fake clock keeps flowing in real time, which made a test flaky on slow CI. Advance with `clock.fastForward` in 1-minute jumps; `runFor` fires every 100ms tick and is far too slow for long sessions.
  - Playwright matches accessible names as **substrings** by default (Testing Library matches whole names): use `exact: true` for short names like `Start` ("Start bell: 3 strikes" also contains it).
  - Sounds are recorded, not heard: an init script (`e2e/sounds.js`, shared by both specs) wraps `HTMLMediaElement.prototype.play` (muted) and Web Audio (`decodeAudioData` mapped back to file paths, `AudioBufferSourceNode.start`; output routed through a muted gain) and pushes file paths to `window.__sounds`; `window.__soundLog` says how each played (`element` / `webaudio` + context state), `window.__decodedSounds` counts decoded bells, `window.__audioStates` records context state changes.
  - Bells now start a moment after the tap (they wait for audio to resume), so poll sound counts (`expect.poll(() => countSound(…))`), and wait for the start bell before `fastForward` - otherwise the fake clock jumps past the 1s resume wait.
  - Headless WebKit pages in parallel runs interrupt each other's Web Audio (context state `interrupted`) even when muted; bells then rightly fall back to `<audio>`. Tests that insist on Web Audio skip when an interruption was recorded (they pass with `--workers=1`).
  - Don't simulate losing the network with `context.setOffline()` or `route()` in WebKit: both cut WebKit off before its service worker can answer (and its offline emulation also blocks media from memory). `offline.spec.js` serves a build itself with Vite's `preview()` and stops that server.
- **CI**: `ci.yml` (npm ci, lint, test, build) and `e2e.yml` (Playwright, report uploaded on failure), both on Node 24, on every PR and push to `main`.
- **Bug fixes are test-first**: write a test, confirm it fails on the old code, then fix. When a new test passes immediately, check it against the old code before trusting it.
- Still manual: real audio in different browsers, **iPhone (every bell - start, woodblock, end - after a real session; emulators don't enforce iOS's no-sound-without-a-tap rule)**, locked screen, volume, layout on real devices, long real-time sessions.

## Workflow

- One branch and one focused PR per change; the owner reviews and merges. Don't merge PRs yourself.
- Commit messages explain the why; PR descriptions include what was verified (test counts, what fails on the old code, manual test steps).
- After a merge: confirm every pushed commit is on `main` (`git merge-base --is-ancestor <sha> origin/main`) **before** deleting branches - GitHub has lagged registering pushes, and a PR was once merged without its last commit.
- Keep this file and `README.md` in sync with behavior changes.

## Testing on a phone (previews and local only)

Never on wisdomtimer.app (`utils/testingTools.js` checks the host):
- `?speed=60` - session time runs 60× faster (1-600; `sessionClock` in `useTimer` and `useSettleCountdown`); a "speed ×N" badge shows while it's on.
- `?debug` - an on-screen panel (`UI/DebugPanel`) with the audio context state and the latest audio events (`debugLog.add()`: unlock, resume, how each bell played or why it fell back, ambient failures). Use both on a Vercel preview for iPhone checks, e.g. `…vercel.app/?speed=60&debug`.

## Common Issues

- **No sound**: sounds load on page open (Start disabled until ready); browsers need a user interaction before audio - pressing Start counts. Check the console and `public/audio/`.
- **Tailwind styles missing**: `npm run dev -- --force`; check `@tailwindcss/postcss` in `postcss.config.js`.
- **npm `EBADENGINE` warnings on Node 25**: Vitest 5 and jsdom 30 officially support Node 22, 24 and 26+; things work, but Node 24 LTS avoids the warnings.

## Dependencies

- **Runtime:** `react`, `react-dom`, `lucide-react`
- **Build:** `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `autoprefixer`
- **Lint:** `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
- **Test:** `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@playwright/test`
