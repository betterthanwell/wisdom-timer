# Architecture

## State
- **TimerContext** - `useReducer` for settings: `duration`, `presetDurations`, `intervalBellsEnabled`, `intervalDuration`, `intervalStart`, `selectedAmbient`, `ambientVolume`, `bellVolume`, `keepScreenAwake`. One generic `SET_SETTING` action (`{ key, value }`); named action functions (`setDuration`, `setKeepScreenAwake`, …) wrap it.
- Saved settings (`localStorage` key `wisdomTimerSettings`) seed the reducer's initial state through `sanitizeSettings()`, which keeps only valid values for known keys and uses defaults otherwise. Saving uses `pickSavedSettings()`: **every setting with a validator in `utils/settings.js` is saved, and nothing else.**
- Session state (running, paused, complete, time left) lives in `useTimer`, not the context.

## Timer (`useTimer`)
- Time left is computed from `expectedEndTimeRef` and `Date.now()`, never by decrementing, so it doesn't drift.
- Returns `timeRemaining`, `isRunning`, `isPaused`, `isComplete`, `endsAt` (end timestamp while running, else `null`), `progress`, `duration`, and `start`, `pause`, `reset`, `updateDuration`.
- A 100ms `setInterval` updates the display. Background tabs throttle it heavily (Chrome: down to once a minute), so the hook also schedules one-off `setTimeout` wake-ups at the end time and at each interval-bell time, and re-checks on `visibilitychange`. A `finished` guard prevents completing twice.
- `pause()` takes the time left from the clock, not the (possibly stale) displayed value.
- `start()` after completion begins a new full session. `finish()` completes a running or paused session early (open-ended sitting).
- Background wake-ups are only scheduled up to 6 hours ahead (`WAKE_UP_HORIZON_MS`), so a 24 h open-ended session with 1-minute bells doesn't create ~1,400 timeouts.
- Interval bells: `useTimer`'s 4th argument is `{ interval, firstAt, callback }` or `null`. `countIntervalBellsDue(elapsed, interval, duration, firstAt)` says how many bells are due - first at `firstAt` (default: one interval), then every `interval`, never at the end; the hook rings when the count goes up, so skipped ticks ring once. `start()` counts already-due bells as rung, so resuming doesn't ring a catch-up bell.

## Audio (`audioManager`)
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

## Offline (service worker)
- `src/sw.js` is not bundled: the `serviceWorker()` plugin in `vite.config.js` emits it as `/sw.js` in production builds, prefixed with `VERSION` (a hash of the worker, the page, the built JS/CSS and `OFFLINE_PUBLIC_FILES`) and `PRECACHE` (`/`, the built files, favicon, manifest, icons, bells). The plugin runs `enforce: 'post'` so `index.html` is in the bundle, and fails the build if it isn't.
- Install caches `PRECACHE` in `wisdom-timer-<VERSION>` and calls `skipWaiting()`; activate deletes older `wisdom-timer-*` caches. Fetch: page loads and `PRECACHE` paths are served from the cache, kept ambient sounds from `AMBIENT_CACHE` (below), everything else from the network. Range requests for kept files (how `<audio>` elements load) get the requested part of the cached file as a 206 (`partOf()`; Safari won't play a full response to one), so bells that fall back to `<audio>` also ring offline.
- So after a deploy, the first load still shows the kept version while the new worker installs and takes over; the next load is new. `vercel.json` serves `/sw.js` with `Cache-Control: no-cache` so updates are found.
- Registered only in production builds (`import.meta.env.PROD`), after `audioManager.init()`, so its downloads don't compete with the bells on a first visit (by then they're revalidations).
- Kill switch if a bad worker ever ships: deploy a `sw.js` that deletes the `wisdom-timer-*` caches and calls `self.registration.unregister()`.
- Ambient sounds: `ambientDownloads` stores them in the `AMBIENT_CACHE` cache (`constants/audioSources.js`, injected into the worker with `AMBIENT_PATHS`), which isn't versioned or deleted on deploys; the worker plays them from there (Range → 206), else the network. Rename the cache if an ambient file changes. Without Cache Storage every sound counts as kept and streams as before.

## Known platform limits
- iOS pauses JavaScript when the screen locks, so no timer runs until unlock; bells can't ring while locked.
- iOS ignores `HTMLMediaElement.volume` (confirmed on an iPhone: gentle ending didn't fade). Bells and the ambient sound now go through Web Audio gains.
- Locked screen: pre-scheduling bells in Web Audio is the remaining idea. Old attempt: branch `claude/locked-screen-audio-6Q8xo` (PR #7) - keep it.

## Security headers
`vercel.json` sets the real HTTP headers: CSP (incl. `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy. `index.html` repeats CSP and others as `<meta>` tags, but browsers ignore `frame-ancestors` and `X-Frame-Options` in meta tags - clickjacking protection comes from `vercel.json`. Keep both CSPs in sync; the CSP allows only same-origin scripts and media. No `X-XSS-Protection` (deprecated; the CSP covers it) or `interest-cohort` (FLoC is gone; Chrome warns about it).

Caching: `/assets/*` (content-hashed build files) is `immutable` for a year; `/sw.js` is `no-cache`; everything else uses Vercel's default (revalidate).

## Accessibility
- `prefers-reduced-motion` disables animations.
- Icon-only buttons and unlabeled inputs have `aria-label`s (Start/Pause/Reset, Minutes, Seconds, "Interval in minutes", "Starting after, in minutes"); the "Interval woodblock" toggle is `role="switch"` with `aria-checked`. Tests rely on these names.
- Keyboard: Space start/pause, R reset. Ignored while typing in inputs, when Cmd/Ctrl/Alt is held (browser shortcuts like Cmd+R stay working), for key repeat (held down), and until the sounds have loaded (like the Start button). Space on a button reached with Tab presses that button; after a click or tap (`pointerdown`) it stays Start/Pause - `:focus-visible` can't tell them apart, since Chromium makes a clicked button focus-visible once a key is pressed. The hint under the settings (`data-testid="keyboard-hint"`) only shows where the main pointer is fine (`pointer-fine:` - mouse/trackpad), not on touch screens.
- Volume sliders are named "Bells volume" / "Sound volume"; choice buttons (settle time, strikes, presets, ambient sound) expose selection with `aria-pressed`.

## Dependencies

- **Runtime:** `react`, `react-dom`, `lucide-react`
- **Build:** `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `autoprefixer`
- **Lint:** `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
- **Test:** `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@playwright/test`
