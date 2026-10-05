import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    include: ['extension/test/**/*.test.ts'],
    exclude: ['extension/e2e/**', '**/node_modules/**'],
    environment: 'jsdom',
    setupFiles: ['extension/test/chromeMock.ts'],
  },
});
