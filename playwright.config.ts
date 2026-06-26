import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config. Browsers are NOT installed yet (deferred) —
 * run `npx playwright install` before `npm run e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // The game is no-fail and auto-advances on RNG-timed delays, so a few flows are
  // inherently timing-sensitive under heavy parallelism — retry transient flakes
  // (the trace is captured on the first retry).
  retries: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/counting-friends/',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/counting-friends/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
