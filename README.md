# 🧘 Wisdom Timer

A calm, focused meditation timer with singing-bowl bells, interval bells, ambient sounds, and a warm glass-morphism design.

**🌐 Live: [https://wisdomtimer.app/](https://wisdomtimer.app/)**

![React](https://img.shields.io/badge/React-19.3-blue) ![Vite](https://img.shields.io/badge/Vite-8.3-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-4.3-cyan) ![Tests](https://img.shields.io/badge/tests-Vitest%20%2B%20Playwright-green)

## 🕊️ Free, for good

No streaks, no stats, no accounts, no ads, no analytics, no payments - not even micropayments. Nothing to nudge you back, nothing to buy, no evil whatsoever: just a timer, some bells and a quiet screen.

Free for anyone, anywhere, any time, for ever.

## ✨ Features

### Timer
- **Any duration** from 1 to 99 minutes with a − / + stepper (1 minute at a time up to 10, then 5); **presets** for 30, 45, 60 and 90 minutes (default 45)
- **Settling in** (optional) - a silent 5 s to 1 min countdown before the start bell of a new session, so you can put the phone down and get comfortable; Cancel, Space or Reset stop it
- **Guided meditation** (optional) - pick one of four guided meditations by Thanissaro Bhikkhu (metta 4 min, breath 12, 30 or 40 min) and press Play: the start bell rings, the voice begins 15 seconds later, and the end bell rings the moment the recording ends. Downloaded when chosen, then kept on your device for offline use. If a phone call (or anything else) interrupts the voice, the session pauses right there and a big **Carry on** button picks it up again
- **Open-ended sitting** (optional) - count up from 00:00 with no set end; interval bells keep ringing, and **Finish** rings the end bell and completes the session
- **Pause and resume** - the start bell rings again when you resume
- **Play after a finished session starts the next one** - no need to press Reset
- **The time as a soft light** - no box around it: the time sits in a warm glow (think *nimitta*) that breathes slowly while you sit - 4 s swelling, 4 s settling - and holds still when paused. The session's progress is a thin trail of light around it; Play, Pause and Reset sit on the card below
- **"Ends at 07:45"** under the timer while a session runs (in your device's time format)
- **Quiet screen while sitting** - while the timer runs, the settings and hints are hidden and the page dims around the glowing time and the metta phrase (on by default; how dark is up to you, 10-90%); "Show settings" brings them back
- **Session counter** - "Session 1", "Session 2", … for sessions completed today (kept in memory: it starts over on reload and on a new day)
- **Keeps the screen awake** while a session runs, so your phone doesn't lock mid-session - in browsers that support it
- **Stays on time in background tabs** - the end and interval bells are scheduled directly, so they ring on time even when the browser slows down timers for a hidden tab

### Sound
- **Start bell** - singing bowl (~43 s)
- **Interval woodblock** - a short woodblock knock every 1-30 minutes (optional), the first one after its own delay of 1-60 minutes (default: every 10 minutes, starting after 5); never at the very end, which belongs to the end bell
- **End bell** - resonant "gling" (~35 s)
- **Ambient sounds** - rain, ocean waves or forest, looping, with a 0.5 s fade in and out
- **Metta mode** (optional) - the four loving-kindness phrases take turns in large letters above the timer while you sit: *May I be happy. May my loved ones be happy. May those I find difficult be happy. May all beings everywhere be happy.* Each shows for 5, 10, 20 or 30 seconds (default 10), then the cycle starts again
- **Gentle ending** (on by default) - the ambient sound fades out over the last minute, so the end bell arrives into silence; the bells themselves never fade
- **Separate volume sliders** for bells and ambient sound; changes apply immediately, including to a bell that is still ringing

### While a session is in progress
| | Running | Paused |
|---|---|---|
| Duration (presets, custom, open-ended) | Locked | Locked - Reset unlocks it |
| Ambient sound choice | Switches right away (via "Show settings") | *None* stops it; another sound starts on resume |
| Volume sliders | Usable (via "Show settings") | Usable |
| Interval woodblock settings | Locked | Usable |

### Completion
- **Enlightenment burst** - a 9-second light animation in three waves, and the title briefly reads "Wisdom Time!"

### Everything else
- **Keyboard shortcuts** - Space to start/pause, R to reset (browser shortcuts like Cmd/Ctrl+R are left alone, typing in a field never triggers them, and Space on a button reached with Tab presses that button); the hint is shown only with a mouse or trackpad, not on touch screens
- **Settings are remembered** in the browser (localStorage) and checked when loaded, so old or damaged saved values fall back to the defaults
- **Accessible** - labelled controls for screen readers, and animations are switched off when your system asks for reduced motion
- **Responsive** - works on phones, tablets and desktops
- **Works offline** - after one visit the app and its bells are kept on your device, so it opens and runs in airplane mode or without signal; bells are held in memory, so losing wifi mid-session changes nothing. Can be added to the home screen
- **Ambient sounds download when you choose one** (with a progress ring), then stay on your device, offline too - so the app itself loads fast
- **Security headers** - Content Security Policy, clickjacking protection and more (`vercel.json`, plus meta tags in `index.html`)

## ⚠️ Known limitations

- **iPhone with the screen locked:** iOS pauses web pages when the phone locks, so bells can't ring until you unlock it. Keeping the screen awake during a session prevents the automatic lock; locking the phone yourself still pauses the page.

## 🚀 Getting Started

### Prerequisites
- **Node.js 22.12 or newer** (24 LTS recommended) - required by Vite 8 and Vitest
- npm

### Run it locally
```bash
npm install
npm run dev          # http://localhost:5173
```

### All scripts
| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Unit and component tests (Vitest), about 10 s |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | End-to-end tests (Playwright) in Chromium, Firefox, WebKit and an iPhone profile; builds first. One-time setup: `npx playwright install chromium firefox webkit` |

## 🧪 Testing

- **Unit and component tests (Vitest + Testing Library + jsdom)** - next to the code they test (`*.test.js(x)` in `src/`). They cover the timer (including background-tab throttling), interval-bell scheduling, the audio manager (with a fake audio element, including an iOS-style one), the session counter, settings validation, and the whole app with fake audio.
- **End-to-end tests (Playwright)** - in `e2e/`. They run the production build in real browser engines with a frozen fake clock, so a 45-minute session takes about a second, and record which sounds play.
- **CI** - GitHub Actions runs lint, unit tests and build (`ci.yml`) and the end-to-end tests (`e2e.yml`) on every pull request and on `main`.

Bugs are fixed test-first: a test that fails on the old code, then the fix.

## 🛠️ Tech Stack

- **React 19** with Context + `useReducer` for settings
- **Vite 8** for the dev server and builds
- **Tailwind CSS 4**
- **Lucide** icons
- **Vitest**, **Testing Library** and **Playwright** for tests
- **ESLint 10**
- Deployed on **Vercel**

## 📁 Project Structure

```
src/
├── App.jsx          # Session flow, keyboard shortcuts, layout
├── sw.js            # Service worker: keeps the app and bells offline
├── components/      # Timer/, Settings/, UI/
├── hooks/           # useTimer (the clock), useAudio, useWakeLock, ...
├── context/         # Settings state (reducer) + saving
├── utils/           # audioManager, ambient downloads, bell scheduling, settings validation, ...
└── constants/       # Sound file paths and the ambient sound list
e2e/                 # Playwright end-to-end tests
public/audio/        # Bell and ambient sound files
docs/                # Session behavior and architecture notes
```

The file-by-file map is in [CLAUDE.md](CLAUDE.md).

## 🔊 Audio Files

```
public/audio/
├── bells/
│   ├── bell-start.mp3       # Start: singing bowl (~43 s)
│   ├── bell-interval.mp3    # Interval: woodblock (~0.3 s)
│   └── bell-end.mp3         # End: gling (~35 s)
├── ambient/
│   ├── rain.mp3             # ~36 min loop
│   ├── ocean.mp3            # ~27 min loop
│   └── forest.mp3           # ~10 min loop
└── guided/                  # Guided meditations (Thanissaro Bhikkhu), played once
    ├── metta.mp3            # 4:09
    ├── breath-12.mp3        # 12:16
    ├── breath-30.mp3        # 29:32
    └── breath-40.mp3        # 40:00
```

The three bell files are AAC audio in an MP4 container despite their `.mp3` names; browsers identify them by content, so they play normally.

## 🎨 Customization

### Preset durations
Edit `initialState` in `src/context/TimerContext.jsx`:
```javascript
duration: 2700,                             // default: 45 minutes (in seconds)
presetDurations: [1800, 2700, 3600, 5400],  // 30, 45, 60, 90 minutes
```

### Background colors
The gradients are Tailwind classes in `src/App.jsx`: `from-[#FDE68A] to-[#F97316]` normally, and a brighter gradient after a session completes.

### Adding an ambient sound
1. Put the file in `public/audio/ambient/`.
2. In `src/constants/audioSources.js`, add it to `AUDIO_SOURCES.ambient` (the buttons follow its order).
3. For an icon, give it an `icon` name and add that to `iconMap` in `src/components/Settings/AmbientSoundSelector.jsx`; otherwise a speaker icon is used.

## 🐛 Troubleshooting

### No sound
- The bells load when the page opens; Start stays disabled with "Loading bells…" until they're ready (at most about 2 s). Ambient sounds download when you choose them.
- Browsers only allow audio after you interact with the page - pressing Start counts.
- Check the browser console (F12) for loading errors, and that the files exist in `public/audio/`.

### Styling issues
- Make sure `@tailwindcss/postcss` is installed, and try `npm run dev -- --force` to clear Vite's cache.

## 📝 License

[MIT](LICENSE) - feel free to use this project for personal or commercial purposes.

## 🙏 Audio Attribution

The bells and ambient sounds are licensed under **CC0 1.0 Universal (Public Domain)**. While attribution is not legally required, we credit the following creators. The guided meditations are not CC0 - see below.

### Bell Sounds
- **Start Bell** - "Singing Bell Hit 2" by ryancacophony
  Source: [Freesound.org](https://freesound.org/people/ryancacophony/sounds/202017/)
  License: CC0 1.0 Universal (Public Domain)

- **Interval Bell (Woodblock)** - "Wood Block Hit" by thomasjaunism
  Source: [Freesound.org](https://freesound.org/people/thomasjaunism/sounds/218460/)
  License: CC0 1.0 Universal (Public Domain)

- **End Bell** - "Gling" by manuelsound
  Source: [Freesound.org](https://freesound.org/people/manuelsound/sounds/829480/)
  License: CC0 1.0 Universal (Public Domain)

### Ambient Sounds
- **Rain** - "Light Gentle Rain" by Naturthusiast
  Source: [Internet Archive](https://archive.org/details/naturesounds-soundtheraphy/Light+Gentle+Rain.mp3)
  License: CC0 1.0 Universal (Public Domain)

- **Ocean Waves** - "Birds With Ocean Waves on the Beach" by Naturthusiast
  Source: [Internet Archive](https://archive.org/details/naturesounds-soundtheraphy/Birds+With+Ocean+Waves+on+the+Beach.mp3)
  License: CC0 1.0 Universal (Public Domain)

- **Forest** - "Relaxing Nature Sounds - Birdsong Sound" by Naturthusiast
  Source: [Internet Archive](https://archive.org/details/naturesounds-soundtheraphy/Relaxing+Nature+Sounds+-+Birdsong+Sound.mp3)
  License: CC0 1.0 Universal (Public Domain)

### Guided Meditations
- **Metta Meditation**, **Breath Meditation - Quick Version**, **Breath Meditation - Older Version** and **Breath Meditation with Instructions for Leaving Meditation** by Thanissaro Bhikkhu
  Source: [dhammatalks.org](https://www.dhammatalks.org/Archive/guided_meditations/guided_meditations.html)
  License: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) / for free distribution only - never to be sold. Included unmodified (renamed files only).

## 🤝 Contributing

Contributions welcome - bug reports, ideas, audio recommendations and pull requests. Please run `npm run lint`, `npm test` and, for UI changes, `npm run test:e2e` before opening a PR; CI runs them too.

---

**Built with ❤️ for mindful moments**

Enjoy your meditation! 🧘‍♀️✨
