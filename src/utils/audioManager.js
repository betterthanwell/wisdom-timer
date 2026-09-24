import { AUDIO_SOURCES } from '../constants/audioSources';

// Time between strikes when a bell rings several times: the bowls get room
// to ring out, the short woodblock knocks come quicker
const BELL_STRIKE_SPACING_MS = { start: 5000, interval: 2000, end: 5000 };

export class AudioManager {
  constructor() {
    this.bells = {
      start: null,
      interval: null,
      end: null,
    };
    // Bells that are currently ringing, so volume changes reach them too
    this.ringingBells = new Set();
    // Timeouts for strikes of a bell pattern that haven't rung yet
    this.pendingStrikes = new Set();
    this.ambientAudio = null;
    this.currentAmbient = null;
    this.bellVolume = 0.7;
    this.ambientVolume = 0.5;
    // Extra 0-1 multiplier on the ambient volume (gentle ending)
    this.ambientLevel = 1;
    this.isInitialized = false;
    this.initPromise = null;
    this.fadeInterval = null;
  }

  // Load the sounds. Safe to call more than once (React StrictMode mounts
  // twice in development): later calls share the first load.
  init() {
    if (!this.initPromise) {
      this.initPromise = this.loadSounds().then((success) => {
        if (!success) this.initPromise = null; // allow a retry
        return success;
      });
    }
    return this.initPromise;
  }

  async loadSounds() {
    try {
      // Create and preload bell audio elements FIRST (they're critical and small)
      this.bells.start = new Audio(AUDIO_SOURCES.bells.start);
      this.bells.interval = new Audio(AUDIO_SOURCES.bells.interval);
      this.bells.end = new Audio(AUDIO_SOURCES.bells.end);

      // Set bell volumes and preload
      const bellLoadPromises = Object.values(this.bells).map(audio => {
        if (audio) {
          audio.volume = this.bellVolume;
          audio.preload = 'auto';
          audio.load(); // Force loading
          // Return a promise that resolves when audio can play
          return new Promise((resolve) => {
            audio.addEventListener('canplaythrough', () => resolve(), { once: true });
            // Timeout fallback in case loading takes too long
            setTimeout(resolve, 2000);
          });
        }
        return Promise.resolve();
      });

      // Wait for bells to load before creating ambient audio
      await Promise.all(bellLoadPromises);

      // Create ambient audio element AFTER bells are ready
      this.ambientAudio = new Audio();
      this.ambientAudio.loop = true;
      this.ambientAudio.volume = 0; // Start at 0 for fade in
      this.ambientAudio.preload = 'auto';

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  // Play a bell sound
  // Ring a bell, optionally several times (a traditional pattern, e.g. three
  // strikes to begin). Later strikes are spaced out and can be cancelled.
  async playBell(type, strikes = 1) {
    for (let strike = 1; strike < strikes; strike++) {
      const timeout = setTimeout(() => {
        this.pendingStrikes.delete(timeout);
        this.strikeBell(type);
      }, strike * (BELL_STRIKE_SPACING_MS[type] ?? 5000));
      this.pendingStrikes.add(timeout);
    }
    await this.strikeBell(type);
  }

  // Stop strikes of a bell pattern that haven't rung yet (a bell that is
  // already ringing rings out)
  cancelPendingBells() {
    this.pendingStrikes.forEach(clearTimeout);
    this.pendingStrikes.clear();
  }

  async strikeBell(type) {
    if (!this.isInitialized) {
      console.warn('AudioManager not initialized. Call init() first.');
      return;
    }

    const bell = this.bells[type];
    if (!bell) {
      console.warn(`Bell type "${type}" not found`);
      return;
    }

    // Create a new Audio element instead of cloning to ensure volume is applied correctly
    const bellAudio = new Audio(bell.src);
    bellAudio.volume = this.bellVolume;
    this.ringingBells.add(bellAudio);

    // Clean up after playing
    bellAudio.addEventListener('ended', () => {
      this.ringingBells.delete(bellAudio);
      bellAudio.src = '';
      bellAudio.remove();
    });

    try {
      await bellAudio.play();
    } catch (error) {
      this.ringingBells.delete(bellAudio);
      console.error(`Failed to play bell "${type}":`, error);
    }
  }

  // Play ambient sound with fade in
  async playAmbient(soundId) {
    if (!this.isInitialized || !this.ambientAudio) {
      console.warn('AudioManager not initialized.');
      return;
    }

    const sound = AUDIO_SOURCES.ambient[soundId];
    if (!sound) {
      console.warn(`Ambient sound "${soundId}" not found`);
      return;
    }

    // Same sound: keep playing, or resume from where it was paused
    if (this.currentAmbient === soundId) {
      this.resumeAmbient();
      return;
    }

    try {
      // Stop current ambient if playing
      if (this.currentAmbient) {
        await this.stopAmbient();
      }

      // Set new source and play
      this.ambientAudio.src = sound.path;
      this.ambientAudio.volume = 0;
      this.currentAmbient = soundId;
      await this.ambientAudio.play();

      // Stopped or switched while play() was pending - don't fade back in
      if (this.currentAmbient !== soundId) {
        return;
      }

      // Fade in
      this.fadeIn();
    } catch (error) {
      if (this.currentAmbient === soundId) {
        this.currentAmbient = null;
      }
      console.error(`Failed to play ambient sound "${soundId}":`, error);
    }
  }

  // Pause ambient sound (without resetting position)
  pauseAmbient() {
    if (!this.ambientAudio || this.ambientAudio.paused) {
      return;
    }
    this.ambientAudio.pause();
  }

  // Resume ambient sound (from paused position)
  resumeAmbient() {
    if (!this.ambientAudio || !this.ambientAudio.paused || !this.currentAmbient) {
      return;
    }
    this.ambientAudio.play().catch((error) => {
      console.error('Failed to resume ambient sound:', error);
    });
  }

  // Stop ambient sound with fade out
  async stopAmbient() {
    if (!this.ambientAudio || !this.currentAmbient) {
      return;
    }

    // No longer the current sound from here on, so a pending playAmbient()
    // won't fade it back in and resumeAmbient() won't restart it
    this.currentAmbient = null;

    const finishStop = () => {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
    };

    // Already paused (e.g. reset while paused): nothing to fade out
    if (this.ambientAudio.paused) {
      this.clearFade();
      finishStop();
      return;
    }

    return new Promise((resolve) => {
      this.fadeOut(() => {
        finishStop();
        resolve();
      });
    });
  }

  // Fade the ambient volume towards getTarget() over 500ms in 20 steps.
  // Always finishes after the last step, even if the browser ignores volume
  // changes (iOS Safari). The target is read on every step, so volume
  // changes made during a fade are applied.
  fade(getTarget, onDone) {
    this.clearFade();

    const steps = 20;
    const from = this.ambientAudio.volume;
    let step = 0;

    this.fadeInterval = setInterval(() => {
      step++;
      const target = getTarget();
      this.ambientAudio.volume = step >= steps ? target : from + (target - from) * (step / steps);

      if (step >= steps) {
        this.clearFade();
        if (onDone) onDone();
      }
    }, 500 / steps);
  }

  clearFade() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  // Fade in effect
  fadeIn() {
    this.fade(() => this.effectiveAmbientVolume());
  }

  // Fade out effect
  fadeOut(callback) {
    this.fade(() => 0, callback);
  }

  // Set bell volume
  setBellVolume(volume) {
    this.bellVolume = Math.max(0, Math.min(1, volume));
    this.ringingBells.forEach(audio => {
      audio.volume = this.bellVolume;
    });
  }

  // Set ambient volume
  setAmbientVolume(volume) {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    this.applyAmbientVolume();
  }

  // Scale the ambient volume by a 0-1 level (used to fade out gently before
  // the end bell), independently of the volume slider
  setAmbientLevel(level) {
    this.ambientLevel = Math.max(0, Math.min(1, level));
    this.applyAmbientVolume();
  }

  effectiveAmbientVolume() {
    return this.ambientVolume * this.ambientLevel;
  }

  // Apply the volume straight away, unless a fade is running (the fade-in
  // reads the target on every step, so it picks the change up itself)
  applyAmbientVolume() {
    if (this.isInitialized && this.ambientAudio && !this.fadeInterval) {
      this.ambientAudio.volume = this.effectiveAmbientVolume();
    }
  }

  // Stop all sound (on unmount). The loaded sounds are kept, so a remount
  // (React StrictMode) can use them without loading everything again.
  cleanup() {
    this.clearFade();
    this.cancelPendingBells();
    this.ringingBells.forEach(audio => audio.pause());
    this.ringingBells.clear();
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
    }
    this.currentAmbient = null;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
