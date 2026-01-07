import { AUDIO_SOURCES } from '../constants/audioSources';

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
    this.isSilentPlaying = false;
    this.audioContext = null;
  }

  // Initialize audio elements (call this on user interaction to satisfy browser autoplay policy)
  async init() {
    try {
      // Create AudioContext for Web Audio API (better background support)
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Resume AudioContext if suspended (required on iOS)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

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

      // Create silent audio for keeping audio session alive on iOS
      this.silentAudio = this.createSilentAudio();

      // Setup Media Session API for lock screen controls
      this.setupMediaSession();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  // Create a silent audio element that loops to keep audio session alive
  createSilentAudio() {
    // Create a very short silent audio using a data URI
    // This is a minimal valid MP3 file that's essentially silent
    const silentAudio = new Audio();
    silentAudio.loop = true;
    silentAudio.volume = 0.01; // Near-silent but not zero (some browsers ignore zero volume)

    // Generate silent audio using AudioContext
    if (this.audioContext) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.001; // Nearly silent
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.frequency.value = 0; // No audible frequency
      this.silentOscillator = oscillator;
      this.silentGainNode = gainNode;
    }

    return silentAudio;
  }

  // Setup Media Session API for lock screen integration
  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Meditation Timer',
        artist: 'Wisdom Timer',
        album: 'Meditation Session',
      });

      // Handle media session actions
      navigator.mediaSession.setActionHandler('play', () => {
        // Resume audio if paused - this will be handled by the app
        this.resumeAudioSession();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        // Pause audio - this will be handled by the app
      });
    }
  }

  // Update media session metadata with timer info
  updateMediaSession(title, timeRemaining) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Meditation Timer',
        artist: timeRemaining ? `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')} remaining` : 'Wisdom Timer',
        album: 'Meditation Session',
      });
      navigator.mediaSession.playbackState = 'playing';
    }
  }

  // Start silent audio to keep audio session alive (for locked screen)
  async startSilentAudio() {
    if (this.isSilentPlaying) return;

    try {
      // Resume AudioContext if suspended
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Start oscillator-based silent audio
      if (this.silentOscillator && !this.isSilentPlaying) {
        this.silentOscillator.start();
        this.isSilentPlaying = true;
      }

      // Update media session to indicate playing
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch (error) {
      // Oscillator may already be started, create a new one
      if (this.audioContext) {
        this.silentOscillator = this.audioContext.createOscillator();
        this.silentGainNode = this.audioContext.createGain();
        this.silentGainNode.gain.value = 0.001;
        this.silentOscillator.connect(this.silentGainNode);
        this.silentGainNode.connect(this.audioContext.destination);
        this.silentOscillator.frequency.value = 0;
        this.silentOscillator.start();
        this.isSilentPlaying = true;
      }
    }
  }

  // Stop silent audio
  stopSilentAudio() {
    if (!this.isSilentPlaying) return;

    try {
      if (this.silentOscillator) {
        this.silentOscillator.stop();
        this.silentOscillator.disconnect();
      }
    } catch (error) {
      // Oscillator may already be stopped
    }

    this.isSilentPlaying = false;

    // Update media session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }

  // Resume audio session (called from media session controls)
  resumeAudioSession() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
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
      // Ensure AudioContext is active (important for iOS background playback)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

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
    // Stop silent audio
    this.stopSilentAudio();

    // Close AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    Object.keys(this.bells).forEach(key => {
      this.bells[key] = null;
    });
    this.isInitialized = false;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
