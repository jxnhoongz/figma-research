/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // The portable kit bundle (scripts/export-kit.py → ./figma-react-kit/) copies
    // test files; exclude it so vitest doesn't run duplicates.
    exclude: ['**/node_modules/**', '**/dist/**', 'figma-react-kit/**'],
  },
})
