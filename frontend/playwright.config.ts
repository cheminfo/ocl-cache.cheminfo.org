import { defineConfig } from '@playwright/test';

const port = Number(process.env.PORT ?? 20822);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

/** The address the served pages name themselves, so the suite can assert it. */
const siteUrl = 'https://ocl-cache.cheminfo.org';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL, trace: 'on-first-retry' },
  // The suite runs against the backend serving the built page, because the
  // head written per route is exactly what it checks.
  webServer: {
    // The scratch database is thrown away first. A migration edited before it
    // ships leaves an already-migrated database with a checksum postgrator
    // refuses, and a run against a stale one fails in a way that looks like a
    // code fault.
    command:
      'rm -rf backend/e2e-data && npm run build -w frontend && npm run start -w backend',
    cwd: '..',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      SITE_URL: siteUrl,
      // A scratch database, so a run never writes into the checkout's own.
      DATA_DIR: 'e2e-data',
    },
  },
});
