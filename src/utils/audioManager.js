import { AUDIO_SOURCES } from '../constants/audioSources';

// Tiny silent MP3 (base64) - approximately 0.1 seconds of silence
const SILENT_MP3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAIAANIAAAAQAAAaQAAAAQAAANIAAAAQAAAaQAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';

class AudioManager {
  constructor() {
    this.bells = {
      start: null,
      interval: null,
      end: null,
    };
    this.ambientAudio = null;
    this.silentAudio = null;
    this.currentAmbient = null;
    this.bellVolume = 0.7;
    this.ambientVolume = 0.5;
    this.isInitialized = false;
    this.fadeInterval = null;
  }

  // Initialize audio elements (call this on user interaction to satisfy browser autoplay policy)
  async init() {
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
  async playBell(type) {
    if (!this.isInitialized) {
      console.warn('AudioManager not initialized. Call init() first.');
      return;
    }

    const bell = this.bells[type];
    if (!bell) {
      console.warn(`Bell type "${type}" not found`);
      return;
    }

    try {
      // Clone the audio to allow overlapping bells
      const bellClone = bell.cloneNode();
      bellClone.volume = this.bellVolume;
      await bellClone.play();

      // Clean up after playing
      bellClone.addEventListener('ended', () => {
        bellClone.remove();
      });
    } catch (error) {
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

    // If same sound is already playing, do nothing
    if (this.currentAmbient === soundId && !this.ambientAudio.paused) {
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
      await this.ambientAudio.play();
      this.currentAmbient = soundId;

      // Fade in
      this.fadeIn();
    } catch (error) {
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
    this.ambientAudio.play();
  }

  // Stop ambient sound with fade out
  async stopAmbient() {
    if (!this.ambientAudio || this.ambientAudio.paused) {
      return;
    }

    return new Promise((resolve) => {
      this.fadeOut(() => {
        this.ambientAudio.pause();
        this.ambientAudio.currentTime = 0;
        this.currentAmbient = null;
        resolve();
      });
    });
  }

  // Fade in effect
  fadeIn() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    const targetVolume = this.ambientVolume;
    const step = targetVolume / 20; // 20 steps
    const interval = 500 / 20; // 500ms total

    this.fadeInterval = setInterval(() => {
      if (this.ambientAudio.volume < targetVolume) {
        this.ambientAudio.volume = Math.min(
          this.ambientAudio.volume + step,
          targetVolume
        );
      } else {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }
    }, interval);
  }

  // Fade out effect
  fadeOut(callback) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    const step = this.ambientAudio.volume / 20; // 20 steps
    const interval = 500 / 20; // 500ms total

    this.fadeInterval = setInterval(() => {
      if (this.ambientAudio.volume > 0.01) {
        this.ambientAudio.volume = Math.max(
          this.ambientAudio.volume - step,
          0
        );
      } else {
        this.ambientAudio.volume = 0;
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        if (callback) callback();
      }
    }, interval);
  }

  // Set bell volume
  setBellVolume(volume) {
    this.bellVolume = Math.max(0, Math.min(1, volume));
    if (this.isInitialized) {
      Object.values(this.bells).forEach(audio => {
        if (audio) {
          audio.volume = this.bellVolume;
        }
      });
    }
  }

  // Set ambient volume
  setAmbientVolume(volume) {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.isInitialized && this.ambientAudio && !this.fadeInterval) {
      this.ambientAudio.volume = this.ambientVolume;
    }
  }

  // Cleanup
  cleanup() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio = null;
    }
    this.stopSilentAudio();
    Object.keys(this.bells).forEach(key => {
      this.bells[key] = null;
    });
    this.isInitialized = false;
  }

  // Setup Media Session API for lock screen display (call when timer starts)
  setupMediaSession(title, timeRemaining) {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Meditation Timer',
        artist: timeRemaining
          ? `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')} remaining`
          : 'Wisdom Timer',
        album: 'Meditation Session',
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch (e) {
      // Media Session API not fully supported, ignore
    }
  }

  // Start silent audio to keep audio session alive (for iOS locked screen)
  startSilentAudio() {
    if (this.silentAudio) return; // Already playing

    try {
      this.silentAudio = new Audio(SILENT_MP3);
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.01; // Near-silent
      this.silentAudio.play().catch(() => {
        // Silent audio failed to play, not critical
        this.silentAudio = null;
      });
    } catch (e) {
      // Failed to create silent audio, not critical
      this.silentAudio = null;
    }
  }

  // Stop silent audio
  stopSilentAudio() {
    if (this.silentAudio) {
      this.silentAudio.pause();
      this.silentAudio = null;
    }
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
