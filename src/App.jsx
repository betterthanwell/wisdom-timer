import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Eye, Settings as SettingsIcon } from 'lucide-react';
import { TimerProvider } from './context/TimerContext';
import { useTimerContext } from './context/useTimerContext';
import { useTimer } from './hooks/useTimer';
import { useAudio } from './hooks/useAudio';
import { useMediaSession } from './hooks/useMediaSession';
import { useSessionCounter } from './hooks/useSessionCounter';
import { useWakeLock } from './hooks/useWakeLock';
import { useSettleCountdown } from './hooks/useSettleCountdown';
import { useAmbientDownloads } from './hooks/useAmbientDownloads';
import { gentleEndingLevel } from './utils/gentleEnding';
import { ambientDownloads } from './utils/ambientDownloads';
import { testingTools, sessionClock } from './utils/testingTools';
import { AUDIO_SOURCES, GUIDED_LEAD_IN_SECONDS } from './constants/audioSources';
import { debugLog } from './utils/debugLog';
import { DebugPanel } from './components/UI/DebugPanel';
import { GlassCard } from './components/UI/GlassCard';
import { SettingLabel } from './components/UI/SettingLabel';
import { TimerDisplay } from './components/Timer/TimerDisplay';
import { TimerControls } from './components/Timer/TimerControls';
import { PresetButtons } from './components/Settings/PresetButtons';
import { DurationSelector } from './components/Settings/DurationSelector';
import { IntervalSettings } from './components/Settings/IntervalSettings';
import { AmbientSoundSelector } from './components/Settings/AmbientSoundSelector';
import { VolumeControls } from './components/Settings/VolumeControls';
import { SettleSetting } from './components/Settings/SettleSetting';
import { GentleEndingSetting } from './components/Settings/GentleEndingSetting';
import { OpenEndedSetting } from './components/Settings/OpenEndedSetting';
import { MettaSetting } from './components/Settings/MettaSetting';
import { DimSetting } from './components/Settings/DimSetting';
import { NimittaSizeSetting } from './components/Settings/NimittaSizeSetting';
import { GuidedSetting } from './components/Settings/GuidedSetting';
import { MettaCard } from './components/Timer/MettaCard';
import { InterruptedPause } from './components/Timer/InterruptedPause';

// Open-ended sitting counts up, as a countdown from 24 hours
const OPEN_ENDED_SECONDS = 24 * 60 * 60;

// A group of settings in the settings card (groups are divided by lines)
const SECTION = 'space-y-4 py-5 first:pt-0 last:pb-0';
// A keyboard key in the shortcut hint
const KEY = 'px-1.5 py-0.5 rounded-md border border-white/30 bg-white/15 font-sans text-[11px] text-white';

function MeditationTimerApp() {
  const { state, actions } = useTimerContext();
  const {
    unlock: unlockAudio,
    playBell,
    cancelPendingBells,
    playAmbient,
    primeAmbient,
    pauseAmbient,
    stopAmbient,
    setBellVolume,
    setAmbientVolume,
    setAmbientLevel,
    setInterruptionListener,
    cutShortVoicePosition,
    isInitialized,
  } = useAudio();
  const { completedToday, startNewDayIfNeeded, recordCompleted } = useSessionCounter();

  // Only an ambient sound that's on the device plays; until it is, the
  // selector shows None (the choice itself is kept and saved)
  const ambientStatuses = useAmbientDownloads();
  const activeAmbient = ambientStatuses[state.selectedAmbient]?.state === 'kept' ? state.selectedAmbient : null;

  // Guided meditation: the recording sets the session - the start bell, the
  // voice after a lead-in, the end bell the moment it finishes - and nothing
  // else plays (no ambient sound, woodblock, metta phrases or settling in)
  const guided = state.guidedMode;
  const guidedTrack = state.guidedTrack;
  const guidedTrackKept = ambientStatuses[guidedTrack]?.state === 'kept';
  const guidedSeconds = GUIDED_LEAD_IN_SECONDS + AUDIO_SOURCES.guided[guidedTrack].seconds;
  const openEnded = state.openEnded && !guided;
  const sessionSeconds = guided ? guidedSeconds : openEnded ? OPEN_ENDED_SECONDS : state.duration;

  // The voice waiting for the lead-in to end
  const voiceTimeoutRef = useRef(null);
  const cancelVoice = useCallback(() => {
    clearTimeout(voiceTimeoutRef.current);
    voiceTimeoutRef.current = null;
  }, []);
  useEffect(() => cancelVoice, [cancelVoice]);

  // A guided session stopped from outside (iOS: a call, Siri, the lock
  // screen): it pauses where the voice stopped, and says so loudly until
  // carried on or reset. (Other sessions run on: the sit's length is the
  // point there.)
  const [interrupted, setInterrupted] = useState(false);
  const pauseAtRef = useRef(null);
  const rescueSession = useCallback(
    (voicePosition) => {
      debugLog.add(`session paused by an interruption (voice at ${voicePosition.toFixed(2)}s)`);
      cancelVoice();
      pauseAmbient();
      pauseAtRef.current(GUIDED_LEAD_IN_SECONDS + voicePosition);
      setInterrupted(true);
    },
    [cancelVoice, pauseAmbient]
  );

  // Callbacks for timer events
  const handleTimerStart = useCallback((elapsed) => {
    debugLog.add('session starts');
    startNewDayIfNeeded();
    if (guided) {
      // The start bell only at the beginning: on resume it would ring over
      // the voice
      if (elapsed === 0) playBell('start', state.startStrikes);
      // The voice picks up exactly where the session is
      const voiceAt = elapsed - GUIDED_LEAD_IN_SECONDS;
      if (voiceAt >= 0) {
        playAmbient(guidedTrack, voiceAt);
      } else {
        cancelVoice();
        voiceTimeoutRef.current = setTimeout(() => playAmbient(guidedTrack, 0), sessionClock.realDelay(-voiceAt * 1000));
      }
      return;
    }
    // Rings on resume too - that's intended
    playBell('start', state.startStrikes);
    // Starts the selected sound, or resumes it if it's the one that was paused
    if (activeAmbient) {
      playAmbient(activeAmbient);
    }
  }, [startNewDayIfNeeded, guided, guidedTrack, cancelVoice, playBell, state.startStrikes, playAmbient, activeAmbient]);

  const handleTimerComplete = useCallback(() => {
    // The page may only wake up (iOS: unlocked) after the end - if the voice
    // was cut short meanwhile, the session isn't over: rescue it
    const cutShortAt = guided ? cutShortVoicePosition() : null;
    if (cutShortAt !== null) {
      rescueSession(cutShortAt);
      return;
    }
    debugLog.add('session complete');
    cancelVoice();
    playBell('end', state.endStrikes);
    stopAmbient();
    recordCompleted();
  }, [guided, cutShortVoicePosition, rescueSession, cancelVoice, playBell, state.endStrikes, stopAmbient, recordCompleted]);

  const handleIntervalBell = useCallback(() => {
    playBell('interval', state.intervalStrikes);
  }, [playBell, state.intervalStrikes]);

  // Initialize audio volumes
  useEffect(() => {
    if (isInitialized) {
      setBellVolume(state.bellVolume);
      setAmbientVolume(state.ambientVolume);
    }
  }, [isInitialized, state.bellVolume, state.ambientVolume, setBellVolume, setAmbientVolume]);

  const timer = useTimer(
    sessionSeconds,
    handleTimerStart,
    handleTimerComplete,
    state.intervalBellsEnabled && !guided
      ? { interval: state.intervalDuration, firstAt: state.intervalStart, callback: handleIntervalBell }
      : null
  );
  const { start: startTimer, pause: pauseTimer, pauseAt, finish: finishTimer, reset: resetTimer, updateDuration } = timer;
  useEffect(() => {
    pauseAtRef.current = pauseAt;
  }, [pauseAt]);
  // Open-ended: show the time sat (counting up) instead of the time left
  const displaySeconds = openEnded ? timer.duration - timer.timeRemaining : timer.timeRemaining;

  // Handle pause - pause ambient sound
  const handlePause = useCallback(() => {
    pauseTimer();
    cancelVoice();
    pauseAmbient();
  }, [pauseTimer, cancelVoice, pauseAmbient]);

  // Told by the audio manager of an interruption: the voice's position, or
  // null before the voice has started (the lead-in)
  const onInterruptionRef = useRef(() => {});
  useEffect(() => {
    onInterruptionRef.current = (voicePosition) => {
      if (!guided || !timer.isRunning) return;
      if (voicePosition !== null) {
        rescueSession(voicePosition);
      } else {
        debugLog.add('session paused by an interruption (lead-in)');
        cancelVoice();
        pauseTimer();
        setInterrupted(true);
      }
    };
  }, [guided, timer.isRunning, rescueSession, cancelVoice, pauseTimer]);
  useEffect(() => {
    setInterruptionListener((voicePosition) => onInterruptionRef.current(voicePosition));
    return () => setInterruptionListener(null);
  }, [setInterruptionListener]);

  // Handle start/resume (ambient sound is handled by handleTimerStart)
  // Quiet screen: while running, settings are hidden unless asked for
  const [settingsRevealed, setSettingsRevealed] = useState(false);

  // Optional settling-in countdown before a new session's start bell. When it
  // ends it calls the *latest* startTimer, so changes made meanwhile (e.g.
  // the ambient sound) are used.
  const { isSettling, settleRemaining, begin: beginSettling, cancel: cancelSettling } = useSettleCountdown();
  const startTimerRef = useRef(startTimer);
  useEffect(() => {
    startTimerRef.current = startTimer;
  }, [startTimer]);

  const handleStart = useCallback(() => {
    // Now, during the tap (or Space): bells started later by timers - the
    // interval and end bells, and the start bell after settling in - are
    // only allowed to play once audio has been unlocked by one
    debugLog.add(`Start tapped${!timer.isPaused && state.settleSeconds > 0 ? `, settling in ${state.settleSeconds}s` : ''}`);
    unlockAudio();
    setInterrupted(false);
    setSettingsRevealed(false); // every start begins quiet
    // A new session: end-bell strikes of the last one still to ring would
    // clash with the start bell (resuming keeps the start bell's strikes)
    if (!timer.isPaused) cancelPendingBells();
    // Settle in only before a new session - resuming starts right away
    // Guided: the voice will start from a timer after the lead-in - prime it now
    if (guided) primeAmbient(guidedTrack);
    if (!timer.isPaused && state.settleSeconds > 0 && !guided) {
      // The ambient sound will start from the countdown's timer: prime it now
      if (activeAmbient) primeAmbient(activeAmbient);
      beginSettling(state.settleSeconds, () => startTimerRef.current());
    } else {
      startTimer();
    }
  }, [unlockAudio, timer.isPaused, cancelPendingBells, guided, guidedTrack, state.settleSeconds, activeAmbient, primeAmbient, beginSettling, startTimer]);

  // Handle reset - stop ambient sound
  const handleReset = useCallback(() => {
    setInterrupted(false);
    cancelSettling();
    cancelVoice();
    cancelPendingBells();
    resetTimer();
    stopAmbient();
  }, [cancelSettling, cancelVoice, cancelPendingBells, resetTimer, stopAmbient]);

  // The session you're on today; once one completes, it stays on that number
  // until Play starts the next (or settling in for it)
  const sessionNumber = timer.isComplete && !isSettling ? completedToday : completedToday + 1;

  const inSession = timer.isRunning || isSettling;
  const quiet = inSession && !settingsRevealed;

  // Changing the dimming level shows it for a moment, so it can be chosen
  // without starting a session
  // Flipping the woodblock switch either way plays one strike, so you hear
  // what it sounds like (from the tap, so iOS allows it)
  const handleIntervalBellsToggle = (enabled) => {
    actions.setIntervalBells(enabled);
    unlockAudio();
    playBell('interval', 1);
  };

  const [previewingDim, setPreviewingDim] = useState(false);
  // The glow's size, tried out with ?debug (not saved)
  const [nimittaSize, setNimittaSize] = useState(1);
  const dimPreviewTimeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(dimPreviewTimeoutRef.current), []);
  const handleDimLevelChange = (level) => {
    actions.setDimLevel(level);
    setPreviewingDim(true);
    clearTimeout(dimPreviewTimeoutRef.current);
    dimPreviewTimeoutRef.current = setTimeout(() => setPreviewingDim(false), 1500);
  };
  const dimmed = state.dimScreen && (quiet || previewingDim);

  // Gentle ending: fade the ambient sound out over the last minute, so the
  // end bell arrives into silence. Full level whenever it doesn't apply.
  const ambientLevel =
    state.gentleEnding && timer.isRunning && !guided ? gentleEndingLevel(timer.timeRemaining, timer.duration) : 1;
  useEffect(() => {
    setAmbientLevel(ambientLevel);
  }, [ambientLevel, setAmbientLevel]);

  // Keep the screen on while a session is running, so the phone doesn't lock.
  // Always, for now: its switch (KeepAwakeSetting, keepScreenAwake) isn't shown.
  useWakeLock(inSession);

  // Duration can only change between sessions, not while running or paused
  const durationLocked = timer.isRunning || timer.isPaused || isSettling;

  // Update timer duration when the user picks a new one
  const handleDurationChange = (newDuration) => {
    if (durationLocked) return;
    actions.setDuration(newDuration);
    updateDuration(newDuration);
  };

  // Switching between a set duration and open-ended sitting (between sessions)
  const handleOpenEndedChange = (enabled) => {
    if (durationLocked) return;
    actions.setOpenEnded(enabled);
    updateDuration(enabled ? OPEN_ENDED_SECONDS : state.duration);
  };

  // Guided meditation on or off, and which one (between sessions)
  const handleGuidedChange = (enabled) => {
    if (durationLocked) return;
    actions.setGuidedMode(enabled);
    updateDuration(enabled ? guidedSeconds : state.openEnded ? OPEN_ENDED_SECONDS : state.duration);
  };
  const handleGuidedTrackSelect = (trackId) => {
    if (durationLocked) return;
    actions.setGuidedTrack(trackId);
    updateDuration(GUIDED_LEAD_IN_SECONDS + AUDIO_SOURCES.guided[trackId].seconds);
    // Choosing one whose download failed tries again
    if (isInitialized) downloadAmbient(trackId);
  };

  // Whether a session is running and which sound is chosen, for a download
  // that finishes later
  const latestRef = useRef({});
  useEffect(() => {
    latestRef.current = { isRunning: timer.isRunning, selectedAmbient: state.selectedAmbient };
  }, [timer.isRunning, state.selectedAmbient]);

  // Download an ambient sound that isn't on the device yet; if a session is
  // running by then and it's still the choice, start it
  const downloadAmbient = useCallback(
    (soundId) => {
      if (ambientDownloads.isKept(soundId)) return;
      ambientDownloads.download(soundId).then((kept) => {
        const latest = latestRef.current;
        if (kept && latest.isRunning && latest.selectedAmbient === soundId) playAmbient(soundId);
      });
    },
    [playAmbient]
  );

  // The chosen sound - also a saved choice at page load - is downloaded once
  // the bells have loaded
  useEffect(() => {
    if (isInitialized && state.selectedAmbient) downloadAmbient(state.selectedAmbient);
  }, [isInitialized, state.selectedAmbient, downloadAmbient]);

  // Likewise the chosen guided meditation, while guided mode is on
  useEffect(() => {
    if (isInitialized && guided) downloadAmbient(guidedTrack);
  }, [isInitialized, guided, guidedTrack, downloadAmbient]);

  // Ambient sound can change at any time. While running it switches right
  // away; while paused the new sound starts on resume. None always stops it.
  // A sound not on the device yet starts once downloaded (by the effect
  // above; choosing it again retries a failed download).
  const handleAmbientSelect = (soundId) => {
    actions.setAmbientSound(soundId);
    if (soundId === null) {
      stopAmbient();
    } else if (ambientDownloads.isKept(soundId)) {
      if (timer.isRunning) playAmbient(soundId);
    } else {
      if (timer.isRunning) {
        // Now, in the tap: lets it start later (iOS), if nothing is playing
        primeAmbient(soundId);
        stopAmbient();
      }
      if (soundId === state.selectedAmbient && ambientStatuses[soundId]?.state === 'failed' && isInitialized) {
        downloadAmbient(soundId);
      }
    }
  };

  // Bright background after completion, fading back once the 9-second burst ends
  const [brightBgFaded, setBrightBgFaded] = useState(false);
  const showBrightBg = timer.isComplete && !brightBgFaded;

  useEffect(() => {
    if (!timer.isComplete) return;

    const fadeBackTimeout = setTimeout(() => {
      setBrightBgFaded(true);
    }, 9000); // Match enlightenment burst duration

    return () => {
      clearTimeout(fadeBackTimeout);
      setBrightBgFaded(false); // Reset for next completion
    };
  }, [timer.isComplete]);

  // Whether focus last moved by Tab (rather than a click or tap)
  const tabbedRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Tab') tabbedRef.current = true;
    };
    const onPointerDown = () => {
      tabbedRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Leave browser shortcuts like Cmd/Ctrl+R (reload) alone
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // A held-down key repeats: act on the first press only. And like the
      // Start button, nothing until the sounds have loaded.
      if (e.repeat || !isInitialized) {
        return;
      }

      // Space on a button reached with Tab presses that button, as usual;
      // after a click or tap it stays Start/Pause
      if (e.code === 'Space' && tabbedRef.current && e.target.closest?.('button')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isSettling) {
          cancelSettling();
        } else if (timer.isRunning) {
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
  }, [isInitialized, timer.isRunning, isSettling, cancelSettling, handleStart, handlePause, handleReset]);

  // The lock screen's play/pause act on the whole session. Pause is like
  // Space; play only resumes - a new session starts in the app.
  useMediaSession({
    status: inSession ? 'playing' : timer.isPaused ? 'paused' : null,
    title: isSettling ? 'Settling in' : timer.isRunning ? 'Meditating' : 'Paused',
    onPause: () => {
      if (isSettling) cancelSettling();
      else if (timer.isRunning) handlePause();
    },
    onPlay: () => {
      if (timer.isPaused) handleStart();
    },
  });

  return (
    <div
      className={`min-h-dvh flex justify-center overflow-x-clip px-4 py-6 sm:py-12 transition-colors duration-[3000ms] ease-in-out ${
        showBrightBg
          ? 'bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE047]'
          : 'bg-gradient-to-br from-[#FDE68A] to-[#F97316]'
      }`}
    >
      {/* Testing tools (previews and local only); the ?debug log is a card
          at the end of the page */}
      {testingTools.speed !== 1 && (
        <div className="fixed top-2 right-2 z-[60] rounded-md bg-black/80 px-2 py-1 font-mono text-xs text-white">
          speed ×{testingTools.speed}
        </div>
      )}

      {/* Dims the page while sitting, if chosen (clicks pass through) */}
      <div
        data-testid="quiet-dim"
        aria-hidden="true"
        className={`fixed inset-0 z-10 pointer-events-none transition-opacity ${
          previewingDim ? 'duration-300' : 'duration-[2000ms]'
        } ${dimmed ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: `rgba(0, 0, 0, ${state.dimLevel})` }}
      />

      <div className="w-full max-w-md sm:max-w-xl space-y-4">
        <h1
          className="text-3xl sm:text-5xl font-bold tracking-tight text-white text-center"
          style={{ textShadow: '0 1px 3px rgba(120, 53, 15, 0.3), 0 0 24px rgba(255, 255, 255, 0.35)' }}
        >
          {showBrightBg ? 'Wisdom Time!' : 'Wisdom Timer'}
        </h1>

        {/* Metta phrases in their own card, above everything while a session is under way */}
        {state.mettaMode && !guided && (timer.isRunning || timer.isPaused) && (
          <MettaCard
            elapsed={timer.duration - timer.timeRemaining}
            seconds={state.mettaSeconds}
            isRunning={timer.isRunning}
          />
        )}

        {/* The time, shining free of any card - or, after an interruption,
            a loud PAUSED with one big button to carry on */}
        {interrupted && timer.isPaused ? (
          <InterruptedPause timeRemaining={timer.timeRemaining} onCarryOn={handleStart} />
        ) : (
        <TimerDisplay
          timeRemaining={displaySeconds}
          progress={openEnded ? 0 : timer.progress}
          isRunning={timer.isRunning}
          isPaused={timer.isPaused}
          isComplete={timer.isComplete}
          sessionNumber={sessionNumber}
          endsAt={openEnded ? null : timer.endsAt}
          settleRemaining={isSettling ? settleRemaining : null}
          glowScale={nimittaSize}
        />
        )}

        {/* The controls, on the card below it */}
        <GlassCard strong className="px-5 py-5">
          <TimerControls
            isRunning={timer.isRunning}
            isSettling={isSettling}
            onStart={handleStart}
            onPause={handlePause}
            onCancel={cancelSettling}
            onFinish={finishTimer}
            showFinish={openEnded && (timer.isRunning || timer.isPaused)}
            onReset={handleReset}
            disabled={!isInitialized}
            startDisabled={(timer.timeRemaining === 0 && !timer.isComplete) || (guided && !guidedTrackKept)}
          />
        </GlassCard>

        {/* While running, settings stay out of the way until asked for */}
        {inSession && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setSettingsRevealed((revealed) => !revealed)}
              aria-expanded={settingsRevealed}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <SettingsIcon className="w-4 h-4" aria-hidden="true" />
              {settingsRevealed ? 'Hide settings' : 'Show settings'}
            </button>
          </div>
        )}

        {/* Settings Card, in groups: guided meditation, duration, bells, metta,
            ambient sound, volume, visual controls */}
        {!quiet && (
          <GlassCard className="px-5 py-5 sm:p-6">
            <div className="flex items-center gap-2 text-white">
              <SettingsIcon className="w-5 h-5" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>

            <div className="mt-4 divide-y divide-white/15">
              <section className={SECTION}>
                <GuidedSetting
                  enabled={guided}
                  track={guidedTrack}
                  downloads={ambientStatuses}
                  onToggle={handleGuidedChange}
                  onTrackSelect={handleGuidedTrackSelect}
                  disabled={durationLocked}
                />
              </section>

              {/* In guided mode the recording sets the session: none of these apply */}
              {!guided && (
              <section className={SECTION}>
                <OpenEndedSetting
                  enabled={state.openEnded}
                  onToggle={handleOpenEndedChange}
                  disabled={durationLocked}
                />
                {/* Open-ended sitting has no duration to choose */}
                {!state.openEnded && (
                  <div className="space-y-3">
                    <SettingLabel icon={Clock}>Duration</SettingLabel>
                    <PresetButtons
                      presets={state.presetDurations}
                      currentDuration={state.duration}
                      onSelect={handleDurationChange}
                      disabled={durationLocked}
                    />
                    <DurationSelector
                      duration={state.duration}
                      onChange={handleDurationChange}
                      disabled={durationLocked}
                    />
                  </div>
                )}
                <SettleSetting
                  seconds={state.settleSeconds}
                  onChange={actions.setSettleSeconds}
                  disabled={durationLocked}
                />
              </section>
              )}

              {!guided && (
              <section className={SECTION}>
                <IntervalSettings
                  enabled={state.intervalBellsEnabled}
                  intervalDuration={state.intervalDuration}
                  intervalStart={state.intervalStart}
                  onToggle={handleIntervalBellsToggle}
                  onIntervalChange={actions.setIntervalDuration}
                  onStartChange={actions.setIntervalStart}
                  disabled={timer.isRunning}
                />
                {/* Bell strikes (BellPatternSettings) aren't shown for now;
                    saved strike counts still apply */}
              </section>
              )}

              {!guided && (
              <section className={SECTION}>
                <MettaSetting
                  enabled={state.mettaMode}
                  seconds={state.mettaSeconds}
                  onToggle={actions.setMettaMode}
                  onSecondsChange={actions.setMettaSeconds}
                />
              </section>
              )}

              {!guided && (
              <section className={SECTION}>
                <AmbientSoundSelector
                  selectedSound={activeAmbient}
                  downloads={ambientStatuses}
                  onSoundSelect={handleAmbientSelect}
                />
                <GentleEndingSetting
                  enabled={state.gentleEnding}
                  onToggle={actions.setGentleEnding}
                />
              </section>
              )}

              {/* Volume */}
              <section className={SECTION}>
                <VolumeControls
                  bellVolume={state.bellVolume}
                  ambientVolume={state.ambientVolume}
                  guided={guided}
                  onBellVolumeChange={(vol) => {
                    actions.setBellVolume(vol);
                    setBellVolume(vol);
                  }}
                  onAmbientVolumeChange={(vol) => {
                    actions.setAmbientVolume(vol);
                    setAmbientVolume(vol);
                  }}
                />
              </section>

              {/* Visual controls, last: the screen while sitting (it's always
                  kept awake, where the browser supports that), and with ?debug
                  the nimitta's size */}
              <section className={SECTION}>
                <SettingLabel icon={Eye}>Visual controls</SettingLabel>
                <DimSetting
                  enabled={state.dimScreen}
                  level={state.dimLevel}
                  onToggle={actions.setDimScreen}
                  onLevelChange={handleDimLevelChange}
                />
                {testingTools.debug && <NimittaSizeSetting size={nimittaSize} onChange={setNimittaSize} />}
              </section>
            </div>

            {!isInitialized && (
              <p className="mt-4 text-xs text-white/70 text-center">Loading bells…</p>
            )}
          </GlassCard>
        )}

        {/* Keyboard shortcuts - only where there's likely a keyboard (a
            mouse or trackpad as the main pointer), not on touch screens */}
        {!quiet && (
          <p
            data-testid="keyboard-hint"
            className="hidden pointer-fine:flex items-center justify-center gap-1.5 text-xs text-white/75"
          >
            <kbd className={KEY}>Space</kbd> start / pause
            <span aria-hidden="true" className="mx-1">·</span>
            <kbd className={KEY}>R</kbd> reset
          </p>
        )}

        {testingTools.debug && <DebugPanel />}
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
