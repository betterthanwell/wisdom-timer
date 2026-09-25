import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { audioManager } from './utils/audioManager';
import { button, click, renderApp, setUpAppTests } from './test/appTestUtils';

vi.mock('./utils/audioManager', () => import('./test/audioManagerMock'));

// Ambient sounds with Cache Storage: a fresh store for each test with
// nothing kept yet, and each download waits until the test finishes it with
// `finishDownload()`
const fake = vi.hoisted(() => ({ resolvers: [], downloads: null, create: null }));
vi.mock('./utils/ambientDownloads', async (importOriginal) => {
  const { createAmbientDownloads } = await importOriginal();
  fake.create = () => {
    const entries = new Map();
    const cache = { match: async (path) => entries.get(path), put: async (path, response) => void entries.set(path, response) };
    const fetchSound = () => new Promise((resolve) => fake.resolvers.push(resolve));
    fake.resolvers = [];
    fake.downloads = createAmbientDownloads({ cacheStorage: { open: async () => cache }, fetchSound });
  };
  return {
    ambientDownloads: {
      subscribe: (listener) => fake.downloads.subscribe(listener),
      statuses: () => fake.downloads.statuses(),
      isKept: (id) => fake.downloads.isKept(id),
      download: (id) => fake.downloads.download(id),
    },
  };
});

const finishDownload = async () => {
  await waitFor(() => expect(fake.resolvers.length).toBeGreaterThan(0));
  await act(async () => fake.resolvers.shift()(new Response('sound')));
};
const pressed = (name) => button(name).getAttribute('aria-pressed');

// Ambient sounds downloaded when chosen (the App tests are split across App.*.test.jsx)
describe('App: ambient downloads', () => {
  setUpAppTests();
  beforeEach(() => {
    fake.create();
  });

  it('a saved sound shows None until it has downloaded, then is selected', async () => {
    localStorage.setItem('wisdomTimerSettings', JSON.stringify({ selectedAmbient: 'ocean' }));
    await renderApp();
    expect(pressed('None')).toBe('true');
    expect(pressed('Ocean Waves')).toBe('false');

    await finishDownload();
    expect(pressed('Ocean Waves')).toBe('true');

    // Starts with the session only now
    click('Start');
    expect(audioManager.playAmbient).toHaveBeenCalledWith('ocean');
  });

  it('a session started before the download finishes is silent, then the sound starts', async () => {
    await renderApp();
    click('Forest');
    await waitFor(() => expect(button('Forest').getAttribute('aria-busy')).toBe('true'));
    click('Start');
    expect(audioManager.playAmbient).not.toHaveBeenCalled();

    await finishDownload();
    expect(audioManager.playAmbient).toHaveBeenCalledWith('forest');
    click('Show settings');
    expect(pressed('Forest')).toBe('true');
  });

  it('a saved sound still downloading at Start plays once downloaded', async () => {
    localStorage.setItem('wisdomTimerSettings', JSON.stringify({ selectedAmbient: 'ocean' }));
    await renderApp();
    click('Start');

    await finishDownload();
    expect(audioManager.playAmbient.mock.calls).toEqual([['ocean']]);
  });

  it('choosing a sound whose download failed tries again', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await renderApp();
    click('Rain');
    await waitFor(() => expect(fake.resolvers.length).toBe(1));
    await act(async () => fake.resolvers.shift()(new Response('offline', { status: 503 })));
    await screen.findByText('Download failed, choose it to try again');

    click('Rain');
    await finishDownload();
    expect(pressed('Rain')).toBe('true');
  });

  it('a sound chosen while running is primed in the tap and plays once downloaded', async () => {
    await renderApp();
    click('Start');
    click('Show settings');
    click('Rain');
    expect(audioManager.primeAmbient).toHaveBeenCalledWith('rain');

    await finishDownload();
    expect(audioManager.playAmbient).toHaveBeenCalledWith('rain');
  });

  it("a download that finishes after another choice doesn't play", async () => {
    await renderApp();
    click('Start');
    click('Show settings');
    click('Rain');
    click('None');

    await finishDownload();
    expect(audioManager.playAmbient).not.toHaveBeenCalled();
    expect(pressed('None')).toBe('true');
  });

  it('shows download progress to screen readers', async () => {
    await renderApp();
    await screen.findByText('Downloads when chosen', { selector: '#ambient-status-rain' });
    click('Rain');
    await screen.findByText('Downloading, 0%');
  });
});
