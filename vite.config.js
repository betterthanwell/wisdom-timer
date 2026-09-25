/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { AUDIO_SOURCES, AMBIENT_CACHE, DOWNLOADED_SOUNDS } from './src/constants/audioSources.js'

// Files from public/ that the service worker keeps for offline use (ambient
// sounds and guided meditations are too big to download up front: the app downloads each
// when chosen, into AMBIENT_CACHE - see src/utils/ambientDownloads.js)
const OFFLINE_PUBLIC_FILES = [
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  ...Object.values(AUDIO_SOURCES.bells),
]

// Emits the service worker (src/sw.js) as /sw.js in production builds, with
// the list of files to keep offline (the page, the built JS/CSS, and the
// files above), a version that changes whenever any of them does, and where
// downloaded ambient sounds are kept
const serviceWorker = () => ({
  name: 'service-worker',
  apply: 'build',
  // After Vite's own plugins, so the bundle includes index.html
  enforce: 'post',
  generateBundle(_, bundle) {
    if (!bundle['index.html']) {
      this.error('index.html is not in the bundle, so the service worker version would miss changes to it')
    }
    const source = readFileSync('src/sw.js', 'utf8')
    const version = createHash('sha256').update(source)
    const precache = ['/']
    for (const file of Object.values(bundle)) {
      version.update(file.fileName).update(file.type === 'chunk' ? file.code : file.source)
      if (file.fileName !== 'index.html') precache.push(`/${file.fileName}`)
    }
    for (const path of OFFLINE_PUBLIC_FILES) {
      version.update(path).update(readFileSync(`public${path}`))
      precache.push(path)
    }

    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source:
        `const VERSION = ${JSON.stringify(version.digest('hex').slice(0, 12))};\n` +
        `const PRECACHE = ${JSON.stringify(precache)};\n` +
        `const AMBIENT_CACHE = ${JSON.stringify(AMBIENT_CACHE)};\n` +
        `const AMBIENT_PATHS = ${JSON.stringify(Object.values(DOWNLOADED_SOUNDS).map((sound) => sound.path))};\n` +
        source,
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
  test: {
    environment: 'jsdom',
    // Playwright's end-to-end tests in e2e/ run separately (npm run test:e2e)
    include: ['src/**/*.test.{js,jsx}'],
  },
})
