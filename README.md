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

### 🎵 Where to Find Free Audio

#### 1. Freesound.org (Recommended for Bells)
- **URL**: https://freesound.org
- **License**: CC0 (Public Domain) or CC-BY (attribution required)
- **Search terms**: "tibetan bell", "singing bowl", "meditation bell", "zen chime"
- **Best for**: High-quality meditation bells and chimes

#### 2. Pixabay Audio Library
- **URL**: https://pixabay.com/sound-effects/
- **License**: Free for commercial use (no attribution required)
- **Search terms**: "zen bell", "gong", "rain ambience", "ocean waves", "forest sounds"
- **Best for**: Both bells and nature sounds

#### 3. FreePD.com
- **URL**: https://freepd.com
- **License**: Public Domain
- **Best for**: Ambient background sounds (rain, ocean, nature)

#### 4. BBC Sound Effects Archive
- **URL**: https://sound-effects.bbcrewind.co.uk/
- **License**: RemArc License (check for your use case)
- **Best for**: Professional nature recordings

### 🎚️ Audio Processing Tips

Use **Audacity** (free, open-source audio editor) to prepare your audio files:

**For Bells:**
1. Keep them short (1-5 seconds)
2. Trim any silence at start/end
3. Normalize volume to -3dB
4. Export as MP3 (128-192kbps)

**For Ambient Sounds:**
1. Create 10-15 minute seamless loops
2. Add fade in/out at loop points (0.5-1 second)
3. Normalize volume to -3dB
4. Export as MP3 (128kbps is sufficient)
5. Keep file sizes reasonable (<2MB each)

**Quick Audacity Workflow:**
1. Import audio → Select All (Cmd/Ctrl+A)
2. Effect → Normalize (-3dB)
3. For loops: Select last 2 seconds → Effect → Fade Out
4. Select first 2 seconds → Effect → Fade In
5. File → Export → Export as MP3

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
- **Meditation Bell** - "Lovely Meditation Bell" by A Clock in the Kingdom
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
