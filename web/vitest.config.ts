import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { FailedFilesReporter } from './src/test/reporters/failed-files-reporter';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    reporters: [
      'verbose',
      new FailedFilesReporter()
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/test/']
    }
  }
});
