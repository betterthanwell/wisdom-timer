/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Playwright's end-to-end tests in e2e/ run separately (npm run test:e2e)
    include: ['src/**/*.test.{js,jsx}'],
  },
})
