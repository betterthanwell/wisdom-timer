// Record which sounds the app plays (by file path), keeping them silent.
// Sounds still really play so the app's audio logic behaves normally; if a
// browser can't decode the file, the app just logs an error. __soundLog also
// says how each played: on an <audio> element, or through Web Audio (with
// the audio context's state at that moment).
export const recordSounds = () => {
  // Once per page, even if the init script runs twice (wrapping twice would
  // count everything double)
  if (window.__sounds) return;
  window.__sounds = [];
  window.__soundLog = [];
  window.__decodedSounds = 0;
  window.__audioStates = [];
  const record = (path, entry) => {
    window.__sounds.push(path);
    window.__soundLog.push({ path, ...entry });
  };

  const realPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    record(new URL(this.src, location.href).pathname, { via: 'element' });
    this.muted = true;
    return realPlay.apply(this, args);
  };

  // Web Audio: remember which file each decoded bell came from
  const downloadedFrom = new WeakMap(); // ArrayBuffer -> path
  const decodedFrom = new WeakMap(); // AudioBuffer -> path
  const realArrayBuffer = Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer = async function () {
    const data = await realArrayBuffer.call(this);
    downloadedFrom.set(data, new URL(this.url).pathname);
    return data;
  };
  const realDecode = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = async function (data, ...args) {
    const path = downloadedFrom.get(data);
    const buffer = await realDecode.call(this, data, ...args);
    if (path) {
      decodedFrom.set(buffer, path);
      window.__decodedSounds++;
    }
    return buffer;
  };
  // Keep Web Audio silent too: anything connected to the speakers goes
  // through a muted gain. (Audible pages in parallel test runs take WebKit's
  // audio from each other - the context turns "interrupted".)
  const muted = new WeakMap(); // context -> muted gain
  const realConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (destination, ...args) {
    if (destination !== this.context.destination) return realConnect.call(this, destination, ...args);
    if (!muted.has(this.context)) {
      const context = this.context;
      context.addEventListener('statechange', () => window.__audioStates.push(context.state));
      const gain = context.createGain();
      gain.gain.value = 0;
      realConnect.call(gain, this.context.destination);
      muted.set(this.context, gain);
    }
    return realConnect.call(this, muted.get(this.context), ...args);
  };

  const realStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    const path = this.buffer && decodedFrom.get(this.buffer);
    if (path) record(path, { via: 'webaudio', state: this.context.state });
    return realStart.apply(this, args);
  };
};

export const soundsPlayed = (page) => page.evaluate(() => window.__sounds);
export const countSound = async (page, name) => (await soundsPlayed(page)).filter((path) => path.includes(name)).length;
export const soundLog = (page) => page.evaluate(() => window.__soundLog);
