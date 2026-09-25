import { AUDIO_SOURCES, DOWNLOADED_SOUNDS } from '../constants/audioSources';
import { debugLog } from './debugLog';

// Time between strikes when a bell rings several times: the bowls get room
// to ring out, the short woodblock knocks come quicker
const BELL_STRIKE_SPACING_MS = { start: 5000, interval: 2000, end: 5000 };
// Longest wait for the bells before Start is enabled
const BELL_LOAD_WAIT_MS = 2000;
// Longest wait for Web Audio to resume before a bell rings on an <audio>
// element instead
const AUDIO_RESUME_WAIT_MS = 1000;

// Bells play through the Web Audio API where the browser has it: each bell is
// downloaded and decoded once, so it rings without a network, and one
// unlock() during a tap lets every later bell play - including the ones
// started by timers (interval, end), which iOS doesn't allow for a fresh
// <audio> element. Bell volume is a gain node, which iOS respects (it ignores
// HTMLMediaElement.volume). Without Web Audio, or until a bell is decoded and
// audio is unlocked, bells play on <audio> elements as before.
export class AudioManager {
  constructor() {
    // Preloaded <audio> elements, only used without Web Audio
    this.bells = {
      start: null,
      interval: null,
      end: null,
    };
    // Web Audio: the context, decoded bells, and the gain all bells go through
    this.context = null;
    this.bellBuffers = {};
    this.bellGain = null;
    // The ambient <audio> element's output, once routed through Web Audio
    this.ambientGain = null;
    // unlock() has been called during a tap, so Web Audio may play
    this.unlocked = false;
    // A resume() in progress, so bells wait for it rather than asking again
    this.resuming = null;
    // Bells that are currently ringing, so volume changes reach them too
    // (<audio> elements) and cleanup can stop them (Web Audio sources)
    this.ringingBells = new Set();
    this.ringingSources = new Set();
    // Timeouts for strikes of a bell pattern that haven't rung yet
    this.pendingStrikes = new Set();
    this.ambientAudio = null;
    this.currentAmbient = null;
    this.bellVolume = 0.7;
    this.ambientVolume = 0.5;
    // Extra 0-1 multiplier on the ambient volume (gentle ending)
    this.ambientLevel = 1;
    // Told when something outside the app (iOS: a call, Siri, the lock
    // screen's controls) stops a guided voice or takes the audio away
    this.interruptionListener = null;
    // The ambient element was paused by the app itself (pauseAmbient)
    this.ambientPausedByApp = false;
    // This stop of the voice has been reported already
    this.interruptionReported = false;
    // Audio was interrupted: the next tap builds fresh audio (iOS may leave
    // the old context "running" but silent until a reload)
    this.needsFreshAudio = false;
    this.isInitialized = false;
    this.initPromise = null;
    this.fadeInterval = null;
    this.fadeEnded = null;
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
      // Bells FIRST (they're critical and small). Loading waits at most 2s,
      // so a slow network can't hold up Start for long.
      this.setUpWebAudio();
      const deadline = new Promise((resolve) => setTimeout(resolve, BELL_LOAD_WAIT_MS));
      await Promise.all(Object.keys(AUDIO_SOURCES.bells).map((type) => this.loadBell(type, deadline)));

      // Create ambient audio element AFTER bells are ready
      this.createAmbientElement();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  // The one element for ambient sounds and guided voices
  createAmbientElement() {
    this.ambientAudio = new Audio();
    this.ambientAudio.loop = true;
    this.ambientAudio.volume = 0; // Start at 0 for fade in
    this.ambientAudio.preload = 'auto';
    this.ambientAudio.addEventListener('pause', () => {
      const position = this.cutShortVoicePosition();
      if (position !== null) this.reportInterruption(position, 'voice paused from outside');
    });
  }

  // After an interruption, in a tap: a new context and bell gain (the
  // decoded bells are kept - they work in any context) and a new ambient
  // element, since an element stays tied to the context it was routed
  // through. Whatever was playing stops; the app starts it again.
  rebuildAudio() {
    this.needsFreshAudio = false;
    debugLog.add(`fresh audio after an interruption (was ${this.context.state})`);
    this.clearFade();
    // Silence and unload the old element first: a closing context may hand
    // it back to the speakers, and iOS may resume what played before a call
    // (a second voice, briefly, on an iPhone)
    const oldElement = this.ambientAudio;
    oldElement.muted = true;
    oldElement.pause();
    oldElement.removeAttribute('src');
    oldElement.load();
    this.context.close?.().catch(() => {});
    this.ringingSources.clear();
    this.ambientGain = null;
    this.resuming = null;
    this.currentAmbient = null;
    this.clearInterruption();
    this.createAmbientElement();
    this.setUpWebAudio();
  }

  setUpWebAudio() {
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      // Created suspended; unlock() starts it during a tap
      this.context = new AudioContextClass();
      this.bellGain = this.context.createGain();
      this.bellGain.gain.value = this.bellVolume;
      this.bellGain.connect(this.context.destination);
      this.context.addEventListener?.('statechange', () => {
        debugLog.add(`audio → ${this.context.state}`);
        if (this.context.state === 'interrupted') this.audioInterrupted();
      });
      debugLog.add(`audio created (${this.context.state})`);
    } catch (error) {
      debugLog.add(`no Web Audio: ${error.name}`);
      console.warn('Web Audio not available, bells play on <audio> elements:', error);
      this.context = null;
      return;
    }

    // iOS: treat the sound as media playback, like <audio>, so the ring/silent
    // switch doesn't mute the bells
    if (navigator.audioSession) {
      navigator.audioSession.type = 'playback';
    }
  }

  // With Web Audio: download and decode the bell (waiting until `deadline` at
  // most; a bell decoded later is used from then on). Without: preload an
  // <audio> element.
  async loadBell(type, deadline) {
    const path = AUDIO_SOURCES.bells[type];

    if (this.context) {
      const decoded = this.decodeBell(path).then((buffer) => {
        if (buffer) this.bellBuffers[type] = buffer;
      });
      await Promise.race([decoded, deadline]);
      return;
    }

    const audio = new Audio(path);
    audio.volume = this.bellVolume;
    audio.preload = 'auto';
    audio.load();
    this.bells[type] = audio;
    const canPlay = new Promise((resolve) => {
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
    });
    await Promise.race([canPlay, deadline]);
  }

  // The decoded bell, or null if it couldn't be downloaded or decoded
  async decodeBell(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      debugLog.add(`decoded ${path.split('/').pop()}`);
      return buffer;
    } catch (error) {
      debugLog.add(`could not decode ${path.split('/').pop()}: ${error.name ?? error}`);
      console.warn(`Could not load bell ${path} for Web Audio, it will play on an <audio> element:`, error);
      return null;
    }
  }

  // Call during a tap or key press (a user gesture). Browsers - iOS strictly -
  // only let sound start without a tap once audio has been unlocked by one.
  unlock() {
    if (!this.context) return;
    if (this.needsFreshAudio) {
      this.rebuildAudio();
      if (!this.context) return;
    }

    this.unlocked = true;
    debugLog.add(`unlock (audio ${this.context.state})`);
    if (this.context.state !== 'running') {
      this.resumeWebAudio();
    }
    this.routeAmbientThroughWebAudio();
    // Older iOS versions also need a sound started within the gesture
    const silence = this.context.createBufferSource();
    silence.buffer = this.context.createBuffer(1, 1, 22050);
    silence.connect(this.context.destination);
    silence.start();
  }

  // Route the ambient <audio> element through a Web Audio gain (once, in a
  // tap), so its volume, fades and gentle ending work on iOS, which ignores
  // <audio> volume. From then on its sound depends on the audio context.
  routeAmbientThroughWebAudio() {
    if (this.ambientGain || !this.ambientAudio || !this.context.createMediaElementSource) return;

    try {
      const source = this.context.createMediaElementSource(this.ambientAudio);
      const gain = this.context.createGain();
      // The level moves from the element to the gain
      gain.gain.value = this.ambientAudio.volume;
      this.ambientAudio.volume = 1;
      source.connect(gain);
      gain.connect(this.context.destination);
      this.ambientGain = gain;
      debugLog.add('ambient routed through Web Audio');
    } catch (error) {
      debugLog.add(`ambient routing FAILED: ${error.name}`);
      console.warn('Ambient sound stays on its <audio> element volume:', error);
    }
  }

  // The ambient sound's output level: its Web Audio gain once routed, else
  // the element's volume
  ambientOutput() {
    return this.ambientGain ? this.ambientGain.gain.value : this.ambientAudio.volume;
  }

  setAmbientOutput(level) {
    if (this.ambientGain) {
      this.ambientGain.gain.value = level;
    } else {
      this.ambientAudio.volume = level;
    }
  }

  // Whether Web Audio is running, resuming it if needed: it may still be
  // resuming from unlock() (the start bell rings in the same tap), or have
  // been interrupted (iOS: a call, Siri, another app's sound). Gives up after
  // a moment, so the bell rings on an <audio> element instead of late or not
  // at all.
  async webAudioRunning() {
    if (this.context.state === 'running') return true;

    // Join a resume already asked for (the tap's own, from unlock()): Safari
    // may refuse one asked for outside a tap
    const resumed = this.resuming ?? this.resumeWebAudio();
    let timeout;
    const gaveUp = new Promise((resolve) => {
      timeout = setTimeout(() => resolve(false), AUDIO_RESUME_WAIT_MS);
    });
    const running = await Promise.race([resumed, gaveUp]);
    clearTimeout(timeout);
    if (!running) debugLog.add(`resume gave up (audio ${this.context.state})`);
    return running && this.context.state === 'running';
  }

  // Resume Web Audio; resolves to whether it worked
  resumeWebAudio() {
    this.resuming = this.context
      .resume()
      .then(
        () => true,
        (error) => {
          debugLog.add(`resume failed: ${error.name}`);
          console.warn('Could not resume audio:', error);
          return false;
        }
      )
      .finally(() => {
        this.resuming = null;
      });
    return this.resuming;
  }

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

    const path = AUDIO_SOURCES.bells[type];
    if (!path) {
      console.warn(`Bell type "${type}" not found`);
      return;
    }

    // Web Audio once the bell is decoded and audio has been unlocked
    const buffer = this.bellBuffers[type];
    if (buffer && this.unlocked && (await this.webAudioRunning())) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.bellGain);
      source.onended = () => this.ringingSources.delete(source);
      this.ringingSources.add(source);
      source.start();
      debugLog.add(`${type} bell → Web Audio`);
      return;
    }
    const reason = !buffer ? 'not decoded' : !this.unlocked ? 'not unlocked' : `audio ${this.context?.state}`;

    // Otherwise an <audio> element. A new element each time (not a clone,
    // which didn't reliably keep the volume)
    const bellAudio = new Audio(path);
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
      debugLog.add(`${type} bell → <audio> (${reason})`);
    } catch (error) {
      this.ringingBells.delete(bellAudio);
      debugLog.add(`${type} bell FAILED on <audio> (${reason}): ${error.name}`);
      console.error(`Failed to play bell "${type}":`, error);
    }
  }

  setInterruptionListener(listener) {
    this.interruptionListener = listener;
  }

  isGuidedVoice(soundId) {
    return soundId !== null && Object.hasOwn(AUDIO_SOURCES.guided, soundId);
  }

  // Where a guided voice was stopped by something outside the app (seconds
  // into the recording), or null if it wasn't: it's paused, but not by the
  // app, and not because the recording ended
  cutShortVoicePosition() {
    const audio = this.ambientAudio;
    if (!audio || !this.isGuidedVoice(this.currentAmbient) || this.ambientPausedByApp) return null;
    return audio.paused && !audio.ended ? audio.currentTime : null;
  }

  // Once per stop: the element's pause event and the context's interruption
  // can both report the same one
  reportInterruption(position, reason) {
    this.needsFreshAudio = true;
    if (this.interruptionReported) return;
    this.interruptionReported = true;
    debugLog.add(`INTERRUPTED: ${reason}${position === null ? '' : ` at ${position.toFixed(2)}s`}`);
    this.interruptionListener?.(position);
  }

  // The system took the audio away (iOS: a call). A guided voice is paused
  // where it was (it can't be heard anyway, and must not run on); the
  // listener decides what the session does.
  audioInterrupted() {
    const audio = this.ambientAudio;
    if (audio && this.isGuidedVoice(this.currentAmbient) && !this.ambientPausedByApp) {
      if (!audio.paused) audio.pause();
      this.reportInterruption(audio.currentTime, 'audio interrupted');
    } else {
      this.reportInterruption(null, 'audio interrupted');
    }
  }

  // Playing again: a later stop is a new one
  clearInterruption() {
    this.ambientPausedByApp = false;
    this.interruptionReported = false;
  }

  // Play ambient sound with fade in. Also plays a guided meditation's
  // recording (ambient sounds don't play in guided mode): once, not looped,
  // from `from` seconds in.
  async playAmbient(soundId, from = 0) {
    if (!this.isInitialized || !this.ambientAudio) {
      console.warn('AudioManager not initialized.');
      return;
    }

    const sound = DOWNLOADED_SOUNDS[soundId];
    if (!sound) {
      console.warn(`Ambient sound "${soundId}" not found`);
      return;
    }
    const guided = Object.hasOwn(AUDIO_SOURCES.guided, soundId);

    // Same sound: keep playing, or resume from where it was paused (a
    // recording from exactly where the session is)
    if (this.currentAmbient === soundId) {
      if (guided) this.ambientAudio.currentTime = from;
      this.clearInterruption();
      this.resumeAmbient();
      return;
    }

    try {
      // Stop current ambient if playing
      if (this.currentAmbient) {
        await this.stopAmbient();
      }

      // Set new source and play (unmuted: it may have been primed)
      this.clearInterruption();
      this.ambientAudio.src = sound.path;
      this.ambientAudio.loop = !guided;
      if (from > 0) this.ambientAudio.currentTime = from;
      this.ambientAudio.muted = false;
      // The last sound may still be fading out: that fade mustn't pause
      // this one when it ends
      this.clearFade();
      this.setAmbientOutput(0);
      // Routed through Web Audio, the sound needs the audio context running
      if (this.ambientGain && this.context.state !== 'running') {
        this.webAudioRunning();
      }
      this.currentAmbient = soundId;
      await this.ambientAudio.play();

      // Stopped or switched while play() was pending - don't fade back in
      if (this.currentAmbient !== soundId) {
        return;
      }

      // Fade in
      this.fadeIn();
      debugLog.add(`ambient ${soundId} playing`);
    } catch (error) {
      if (this.currentAmbient === soundId) {
        this.currentAmbient = null;
      }
      debugLog.add(`ambient ${soundId} FAILED: ${error.name}`);
      console.error(`Failed to play ambient sound "${soundId}":`, error);
    }
  }

  // Call during a tap when the ambient sound will start later, from a timer
  // (after settling in): iOS only lets a timer start an <audio> element that
  // was already started in a tap. Plays it muted (iOS ignores volume, not
  // muted) and pauses it again; playAmbient() unmutes it.
  primeAmbient(soundId) {
    const sound = DOWNLOADED_SOUNDS[soundId];
    if (!sound || !this.ambientAudio || this.currentAmbient) return;

    const audio = this.ambientAudio;
    audio.src = sound.path;
    audio.muted = true;
    audio.play().then(
      () => {
        // Unless the sound has really started meanwhile
        if (!this.currentAmbient) audio.pause();
        debugLog.add(`ambient ${soundId} primed`);
      },
      (error) => debugLog.add(`ambient ${soundId} priming FAILED: ${error.name}`)
    );
  }

  // Pause ambient sound (without resetting position)
  pauseAmbient() {
    if (!this.ambientAudio) return;
    // Also when something else paused it first: the app has taken note
    this.ambientPausedByApp = true;
    if (this.ambientAudio.paused) return;
    this.ambientAudio.pause();
  }

  // Resume ambient sound (from paused position)
  resumeAmbient() {
    if (!this.ambientAudio || !this.ambientAudio.paused || !this.currentAmbient) {
      return;
    }
    this.clearInterruption();
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

    // Cut short (a new sound started, or a stop while paused), the fade
    // leaves the element to whoever cut it short
    return new Promise((resolve) => {
      this.fadeOut((finished) => {
        if (finished) finishStop();
        resolve();
      });
    });
  }

  // Fade the ambient volume towards getTarget() over 500ms in 20 steps.
  // Always finishes after the last step, even if the browser ignores volume
  // changes (iOS Safari). The target is read on every step, so volume
  // changes made during a fade are applied. onEnd(finished) is called once:
  // true after the last step, false if the fade is cleared first.
  fade(getTarget, onEnd) {
    this.clearFade();

    const steps = 20;
    const from = this.ambientOutput();
    let step = 0;

    this.fadeInterval = setInterval(() => {
      step++;
      const target = getTarget();
      this.setAmbientOutput(step >= steps ? target : from + (target - from) * (step / steps));

      if (step >= steps) {
        this.fadeEnded = null;
        this.clearFade();
        onEnd?.(true);
      }
    }, 500 / steps);
    if (onEnd) this.fadeEnded = () => onEnd(false);
  }

  clearFade() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    const ended = this.fadeEnded;
    this.fadeEnded = null;
    ended?.();
  }

  // Fade in effect
  fadeIn() {
    this.fade(() => this.effectiveAmbientVolume());
  }

  // Fade out effect
  fadeOut(onEnd) {
    this.fade(() => 0, onEnd);
  }

  // Set bell volume
  setBellVolume(volume) {
    this.bellVolume = Math.max(0, Math.min(1, volume));
    if (this.bellGain) {
      this.bellGain.gain.value = this.bellVolume;
    }
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
      this.setAmbientOutput(this.effectiveAmbientVolume());
    }
  }

  // Stop all sound (on unmount). The loaded sounds are kept, so a remount
  // (React StrictMode) can use them without loading everything again.
  cleanup() {
    this.clearFade();
    this.cancelPendingBells();
    this.ringingBells.forEach(audio => audio.pause());
    this.ringingBells.clear();
    this.ringingSources.forEach((source) => source.stop());
    this.ringingSources.clear();
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
    }
    this.currentAmbient = null;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
