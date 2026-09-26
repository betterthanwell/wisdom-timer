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
  window.__decodes = []; // { path, context: 1, 2, … (which audio context), at: ms since the page loaded }
  window.__audioStates = [];
  const record = (path, entry) => {
    window.__sounds.push(path);
    window.__soundLog.push({ path, ...entry });
  };

  const realPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    record(new URL(this.src, location.href).pathname, { via: 'element' });
    // The latest element played, so a test can act from outside the app
    // (e.g. pause it, like iOS does for a call)
    window.__lastMediaElement = this;
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
  const contextNumbers = new WeakMap(); // context -> 1, 2, …
  const realDecode = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = async function (data, ...args) {
    const path = downloadedFrom.get(data);
    const buffer = await realDecode.call(this, data, ...args);
    if (path) {
      decodedFrom.set(buffer, path);
      window.__decodedSounds++;
      if (!contextNumbers.has(this)) contextNumbers.set(this, contextNumbers.size + 1);
      window.__decodes.push({ path, context: contextNumbers.get(this), at: Math.round(performance.now()) });
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
      window.__audioContext = context;
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

// When a test fails, print what its page did with sound - how each sound
// played, the audio context's state and its changes, each bell decode - and
// the page's console messages, so CI logs say why a bell didn't ring. Call
// once per spec file.
export const reportSoundsOnFailure = (test) => {
  let messages = [];
  test.beforeEach(({ page }) => {
    messages = [];
    page.on('console', (message) => messages.push(`${message.type()}: ${message.text()}`));
    page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));
  });
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) return;
    const audio = await page
      .evaluate(() => ({ state: window.__audioContext?.state, changes: window.__audioStates, sounds: window.__soundLog, decodes: window.__decodes }))
      .catch((error) => `unavailable (${error.message})`);
    console.log(
      [`[${testInfo.project.name}] ${testInfo.title}`, `audio: ${JSON.stringify(audio)}`, 'console:', ...messages].join('\n  ')
    );
  });
};
