# 🧘 Wisdom Timer

A beautiful, modern meditation timer with ambient sounds, interval bells, and a stunning gradient UI.

**🌐 Live Demo: [https://wisdom-timer-online.vercel.app/](https://wisdom-timer-online.vercel.app/)**

![Meditation Timer](https://img.shields.io/badge/React-19.2.0-blue) ![Vite](https://img.shields.io/badge/Vite-7.3.0-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-4.1.18-cyan)

## ✨ Features

✅ **Custom timer** - Specify any duration with minute/second inputs
✅ **Preset buttons** - Quick access to 10, 30, 45, 60 minute sessions
✅ **Start bell** - Welcoming tone when meditation begins
✅ **End bell** - Completion tone when timer finishes
✅ **Interval bells** - Optional periodic reminders during meditation
✅ **Ambient sounds** - Rain, ocean, forest, white-noise (seamless looping)
✅ **Volume controls** - Separate controls for bells and ambient sounds
✅ **Settings persistence** - Automatically saves your preferences
✅ **Responsive design** - Beautiful on mobile, tablet, and desktop
✅ **Modern UI** - Gradient background with glass-morphism effects
✅ **Smooth animations** - Polished interactions and transitions

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 🔊 Audio Files

The app includes the following audio files in the `public/audio` directory:

### Audio Files Structure

```
public/
└── audio/
    ├── bells/
    │   ├── bell-start.mp3       # Plays when meditation starts
    │   ├── bell-interval.mp3    # Plays at intervals (if enabled)
    │   └── bell-end.mp3         # Plays when meditation completes
    └── ambient/
        ├── rain.mp3             # Rain ambience
        ├── ocean.mp3            # Ocean waves
        └── forest.mp3           # Forest sounds
```

## ⌨️ Keyboard Shortcuts

- **Space** - Play/Pause timer
- **R** - Reset timer

## 🛠️ Tech Stack

- **React 19** - UI library with latest features
- **Vite 7** - Lightning-fast build tool
- **Tailwind CSS v4** - Utility-first CSS with custom theme
- **Lucide React** - Beautiful, consistent icons
- **Context API + Reducer** - State management
- **LocalStorage** - Settings persistence

## 📁 Project Structure

```
src/
├── components/
│   ├── Timer/              # Timer display and controls
│   │   ├── TimerDisplay.jsx
│   │   ├── TimerControls.jsx
│   │   └── CircularProgress.jsx
│   ├── Settings/           # Configuration components
│   │   ├── PresetButtons.jsx
│   │   ├── DurationSelector.jsx
│   │   ├── IntervalSettings.jsx
│   │   └── AmbientSoundSelector.jsx
│   └── UI/                 # Reusable UI components
│       ├── GlassCard.jsx
│       └── Button.jsx
├── hooks/                  # Custom React hooks
│   ├── useTimer.js         # Timer logic with accuracy
│   ├── useAudio.js         # Audio playback wrapper
│   └── useLocalStorage.js  # Persistent settings
├── context/                # State management
│   └── TimerContext.jsx    # Central state with reducer
├── utils/                  # Utility functions
│   ├── audioManager.js     # Audio system with fade effects
│   └── timeFormatter.js    # Time formatting utilities
├── constants/              # App constants
│   └── audioSources.js     # Audio file paths
├── App.jsx                 # Main application
├── main.jsx               # App entry point
└── index.css              # Global styles + Tailwind
```

## 🎨 Customization

### Change Gradient Colors

Edit `src/index.css`:

```css
@theme {
  --color-gradient-start: #FDE68A;  /* Light Yellow */
  --color-gradient-end: #F97316;    /* Vivid Orange */
}
```

### Modify Preset Durations

Edit `src/context/TimerContext.jsx`:

```javascript
const initialState = {
  presetDurations: [600, 1800, 2700, 3600], // 10, 30, 45, 60 min
  // Change to your preferred durations (in seconds)
};
```

### Add More Ambient Sounds

1. Add audio file to `public/audio/ambient/`
2. Update `src/constants/audioSources.js`:

```javascript
export const AMBIENT_SOUNDS = [
  // ... existing sounds
  { id: 'newSound', name: 'New Sound', path: '/audio/ambient/new-sound.mp3', icon: 'Music' },
];
```

## 🐛 Troubleshooting

### Audio not playing
- **Browser autoplay policy**: Click the play button to initialize audio
- **Missing files**: Check that audio files exist in `public/audio/` directories
- **Check console**: Open browser DevTools (F12) to see audio loading errors

### Styling issues
- **Tailwind not loading**: Ensure `@tailwindcss/postcss` is installed
- **Clear cache**: Try `npm run dev -- --force`

### Timer drift
- The timer uses `Date.now()` calculations to prevent drift from CPU throttling
- Should remain accurate even on slower devices or backgrounded tabs

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Audio Attribution

All audio files used in this project are licensed under **CC0 1.0 Universal (Public Domain)**. While attribution is not legally required, we credit the following creators:

### Bell Sounds
- **Start Bell** - "Singing Bell Hit 2" by ryancacophony
  Source: [Freesound.org](https://freesound.org/people/ryancacophony/sounds/202017/)
  License: CC0 1.0 Universal (Public Domain)

- **Interval Bell (Woodblock)** - "Wood Block Hit" by thomasjaunism
  Source: [Freesound.org](https://freesound.org/people/thomasjaunism/sounds/218460/)
  License: CC0 1.0 Universal (Public Domain)

- **End Bell** - "Lovely Meditation Bell" by A Clock in the Kingdom
  Source: [Internet Archive](https://archive.org/details/LovelyMeditationBell)
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

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Share your audio recommendations

## 🌟 Future Enhancements

- [ ] Session history and statistics
- [ ] Multiple timer profiles
- [ ] Dark/light theme toggle
- [ ] Additional ambient sounds
- [ ] Guided meditation audio
- [ ] Progressive Web App (PWA) support
- [ ] Social sharing of meditation sessions
- [ ] Integration with meditation apps

---

**Built with ❤️ for mindful moments**

Enjoy your meditation! 🧘‍♀️✨
