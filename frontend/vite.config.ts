import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
  preview: { host: 'localhost', port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    clearMocks: true,
    fileParallelism: false,
    testTimeout: 15000,
  },
});
