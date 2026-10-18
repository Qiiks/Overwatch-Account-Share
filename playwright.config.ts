import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end suite: drives the real client against the real API.
 *
 * Prerequisites: `server/.env` filled in (Supabase URL + keys, JWT_SECRET,
 * ENCRYPTION_SECRET, OAUTH_STATE_SECRET, ALLOWED_ORIGINS=http://localhost:3000) and a
 * seeded dev user (`ALLOW_DEV_SEED=1 node server/scripts/seed-dev.js`). The suite starts
 * both processes itself unless they are already running.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'npm --prefix server start',
      url: 'http://localhost:5001/health',
      // Reuse an already-running stack by default (CI commonly exports CI=true, which must
      // not force a second copy); set PW_FRESH=1 to force Playwright to start its own.
      reuseExistingServer: process.env.PW_FRESH !== '1',
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm --prefix client run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: process.env.PW_FRESH !== '1',
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
