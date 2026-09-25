import { expect } from '@playwright/test';

// Record which sounds the app plays (by file path), keeping them silent.
// Real play() still runs so the app's audio logic behaves normally; if a
// browser can't decode the file, the app just logs an error. Whether each
// play() worked goes to __soundResults. Sounds played from memory (blob:
// URLs) are recorded by the path they were downloaded from.
export const recordSounds = () => {
  window.__sounds = [];
  window.__soundResults = [];
  const downloadedFrom = new WeakMap(); // Blob -> path
  const blobPaths = new Map(); // blob: URL -> path

  const realBlob = Response.prototype.blob;
  Response.prototype.blob = async function () {
    const blob = await realBlob.call(this);
    downloadedFrom.set(blob, new URL(this.url).pathname);
    return blob;
  };
  const realCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = (object) => {
    const url = realCreateObjectURL.call(URL, object);
    if (downloadedFrom.has(object)) blobPaths.set(url, downloadedFrom.get(object));
    return url;
  };

  const realPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    const path = blobPaths.get(this.src) ?? new URL(this.src, location.href).pathname;
    window.__sounds.push(path);
    this.muted = true;
    const result = realPlay.apply(this, args);
    result.then(
      () => window.__soundResults.push({ path, ok: true }),
      (error) => window.__soundResults.push({ path, ok: false, error: error.name })
    );
    return result;
  };
};

export const soundsPlayed = (page) => page.evaluate(() => window.__sounds);
export const countSound = async (page, name) => (await soundsPlayed(page)).filter((path) => path.includes(name)).length;

// Plays that didn't work, once `count` plays have settled
export const failedPlays = async (page, count) => {
  await expect.poll(() => page.evaluate(() => window.__soundResults.length)).toBe(count);
  return page.evaluate(() => window.__soundResults.filter((result) => !result.ok));
};
