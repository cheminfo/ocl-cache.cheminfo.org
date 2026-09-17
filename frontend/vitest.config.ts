import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // e2e/ holds the Playwright suite, which vitest must not pick up.
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
    },
    snapshotFormat: {
      maxOutputLength: Number.MAX_SAFE_INTEGER,
    },
  },
});
