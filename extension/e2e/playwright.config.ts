import { defineConfig } from '@playwright/test';
import { FIXTURE_ORIGIN } from './constants';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  testIgnore: 'fixture/**',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: 'list',
  use: {
    baseURL: FIXTURE_ORIGIN,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --config fixture/vite.config.ts',
    url: FIXTURE_ORIGIN,
    reuseExistingServer: false,
    timeout: 60000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
