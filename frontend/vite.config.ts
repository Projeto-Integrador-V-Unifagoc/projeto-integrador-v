/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  envDir: process.env.ACADEMICO_MODO_TESTE === 'true' ? false : undefined,
  plugins: [react()],
  test: {
    maxWorkers: 2,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
