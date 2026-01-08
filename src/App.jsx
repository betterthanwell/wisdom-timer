import { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, Smartphone } from 'lucide-react';
import { TimerProvider, useTimerContext } from './context/TimerContext';
import { useTimer } from './hooks/useTimer';
import { useAudio } from './hooks/useAudio';
import { useWakeLock } from './hooks/useWakeLock';
import { audioManager } from './utils/audioManager';
import { GlassCard } from './components/UI/GlassCard';
import { Button } from './components/UI/Button';
import { TimerDisplay } from './components/Timer/TimerDisplay';
import { TimerControls } from './components/Timer/TimerControls';
import { PresetButtons } from './components/Settings/PresetButtons';
import { DurationSelector } from './components/Settings/DurationSelector';
import { IntervalSettings } from './components/Settings/IntervalSettings';
import { AmbientSoundSelector } from './components/Settings/AmbientSoundSelector';
import { VolumeControls } from './components/Settings/VolumeControls';

function MeditationTimerApp() {
  const { state, actions } = useTimerContext();
  const {
    playBell,
    playAmbient,
    pauseAmbient,
    resumeAmbient,
    stopAmbient,
    setBellVolume,
    setAmbientVolume,
    setupMediaSession,
    startSilentAudio,
    stopSilentAudio,
    setBackgroundTimer,
    clearBackgroundTimer,
    isInitialized,
  } = useAudio();

  const {
    isSupported: wakeLockSupported,
    requestWakeLock,
    releaseWakeLock,
  } = useWakeLock();

  // Track if this is the first start (vs resume from pause)
  const isFirstStartRef = useRef(true);

  // Track bright background state after completion
  const [showBrightBg, setShowBrightBg] = useState(false);

  // Handle timer completion (called by both JS timer and background audio timer)
  // Uses audioManager directly to avoid stale closure issues with useRef
  const handleTimerComplete = useRef(() => {
    audioManager.playBell('end');
    audioManager.stopAmbient();
    audioManager.stopSilentAudio();
    audioManager.clearBackgroundTimer();
    releaseWakeLock();
    isFirstStartRef.current = true; // Reset for next session
  }).current;

  // Callbacks for timer events
  const handleTimerStart = () => {
    playBell('start');
    // Only start ambient on first start, not on resume
    if (isFirstStartRef.current) {
      if (state.selectedAmbient) {
        playAmbient(state.selectedAmbient);
        // Set up background timer for iOS locked screen support
        setBackgroundTimer(state.duration, handleTimerComplete);
      }
      setupMediaSession('Meditation in Progress', state.duration);

      // Request wake lock if enabled
      if (state.keepScreenOn) {
        requestWakeLock();
      }
    }
    isFirstStartRef.current = false;
  };

  const handleIntervalBell = () => {
    playBell('interval');
  };

  // Handle pause - pause ambient sound
  const handlePause = () => {
    timer.pause();
    pauseAmbient();
    clearBackgroundTimer(); // Clear background timer on pause
  };

  // Handle start/resume
  const handleStart = () => {
    timer.start();
    // If resuming (not first start), resume ambient and background timer
    if (!isFirstStartRef.current) {
      if (state.selectedAmbient) {
        resumeAmbient();
      }
      // Re-set background timer with remaining time
      setBackgroundTimer(timer.timeRemaining, handleTimerComplete);
    }
  };

  // Handle reset - stop ambient sound
  const handleReset = () => {
    timer.reset();
    stopAmbient();
    stopSilentAudio();
    clearBackgroundTimer();
    releaseWakeLock();
    isFirstStartRef.current = true; // Reset for next session
  };

  // Initialize audio volumes
  useEffect(() => {
    if (isInitialized) {
      setBellVolume(state.bellVolume);
      setAmbientVolume(state.ambientVolume);
    }
  }, [isInitialized, state.bellVolume, state.ambientVolume, setBellVolume, setAmbientVolume]);

  const timer = useTimer(
    state.duration,
    handleTimerStart,
    handleTimerComplete,
    state.intervalBellsEnabled
      ? { interval: state.intervalDuration, callback: handleIntervalBell }
      : null
  );

  // Update timer duration when context changes
  useEffect(() => {
    if (!timer.isRunning) {
      timer.updateDuration(state.duration);
    }
  }, [state.duration]);

  // Manage bright background after completion
  useEffect(() => {
    if (timer.isComplete) {
      // Show bright background during/after burst
      setShowBrightBg(true);

      // Fade back to original after 9-second burst completes
      const fadeBackTimeout = setTimeout(() => {
        setShowBrightBg(false);
      }, 9000); // Match enlightenment burst duration

      return () => clearTimeout(fadeBackTimeout);
    } else {
      // Reset immediately when timer restarts
      setShowBrightBg(false);
    }
  }, [timer.isComplete]);

  // Update media session with remaining time (for iOS lock screen display)
  useEffect(() => {
    if (timer.isRunning) {
      setupMediaSession('Meditation in Progress', timer.timeRemaining);
    }
  }, [timer.timeRemaining, timer.isRunning, setupMediaSession]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (timer.isRunning) {
          handlePause();
        } else {
          handleStart();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [timer.isRunning, handleStart, handlePause, handleReset]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-all duration-[3000ms] ease-in-out ${
        showBrightBg
          ? 'bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE047]'
          : 'bg-gradient-to-br from-[#FDE68A] to-[#F97316]'
      }`}
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo */}
        <h1
          className="text-4xl md:text-5xl font-bold text-white text-center"
          style={{
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.4), 0 0 30px rgba(255, 255, 255, 0.2)',
            WebkitTextStroke: '1px rgba(0, 0, 0, 0.1)'
          }}
        >
          {showBrightBg ? 'Wisdom Time!' : 'Wisdom Timer'}
        </h1>

        {/* Main Timer Card */}
        <GlassCard strong className="p-8 md:p-12 !mt-2">
          <div className="space-y-8">
            {/* Timer Display */}
            <TimerDisplay
              timeRemaining={timer.timeRemaining}
              progress={timer.progress}
              isRunning={timer.isRunning}
              isComplete={timer.isComplete}
            />

            {/* Timer Controls */}
            <TimerControls
              isRunning={timer.isRunning}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              disabled={!isInitialized}
            />
          </div>
        </GlassCard>

        {/* Settings Card */}
        <GlassCard className="p-6 !mt-6">
          <div className="space-y-6">
            {/* Settings Header */}
            <div className="flex items-center gap-2 text-white">
              <SettingsIcon className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>

            {/* Preset Buttons */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Quick Select
              </label>
              <PresetButtons
                presets={state.presetDurations}
                currentDuration={state.duration}
                onSelect={actions.setDuration}
                disabled={timer.isRunning}
              />
            </div>

            {/* Custom Duration */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">
                Custom Duration
              </label>
              <DurationSelector
                duration={state.duration}
                onChange={actions.setDuration}
                disabled={timer.isRunning}
              />
            </div>

            {/* Interval Bells */}
            <IntervalSettings
              enabled={state.intervalBellsEnabled}
              intervalDuration={state.intervalDuration}
              onToggle={actions.setIntervalBells}
              onIntervalChange={actions.setIntervalDuration}
              disabled={timer.isRunning}
            />

            {/* Ambient Sounds */}
            <AmbientSoundSelector
              selectedSound={state.selectedAmbient}
              onSoundSelect={actions.setAmbientSound}
              disabled={false}
            />

            {/* Volume Controls */}
            <VolumeControls
              bellVolume={state.bellVolume}
              ambientVolume={state.ambientVolume}
              onBellVolumeChange={(vol) => {
                actions.setBellVolume(vol);
                setBellVolume(vol);
              }}
              onAmbientVolumeChange={(vol) => {
                actions.setAmbientVolume(vol);
                setAmbientVolume(vol);
              }}
              disabled={false}
            />

            {/* Keep Screen On Toggle */}
            {wakeLockSupported && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-white/70" />
                  <span className="text-sm font-medium text-white">Keep Screen On</span>
                </div>
                <button
                  onClick={() => actions.setKeepScreenOn(!state.keepScreenOn)}
                  disabled={timer.isRunning}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    state.keepScreenOn ? 'bg-white/30' : 'bg-white/10'
                  } ${timer.isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      state.keepScreenOn ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Audio Initialization Notice */}
            {!isInitialized && (
              <div className="text-xs text-white/60 text-center">
                Click play to enable audio
              </div>
            )}
          </div>
        </GlassCard>

        {/* Footer */}
        <div className="text-center text-white/60 text-sm">
          <p>Press space to play/pause • R to reset</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <TimerProvider>
      <MeditationTimerApp />
    </TimerProvider>
  );
}

export default App;
