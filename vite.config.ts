
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base is set at build time for GitHub Pages (repo subpath); defaults to '/'
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
