import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Six of these files reach the worker pool, and it sizes itself to the
    // machine: one pool per core, per file, all running OpenChemLib at once.
    // On a ten-core machine that is sixty threads fighting, which starved an
    // unrelated 176 ms test past the five-second timeout. Run the files one
    // after another and only one pool is ever alive — same wall clock,
    // measured, and no flake.
    fileParallelism: false,
    coverage: {
      include: ['src/**/*.ts'],
      // openchemlib dominates test time and v8 profiles every loaded module;
      // istanbul instruments only src.
      provider: 'istanbul',
    },
    snapshotFormat: {
      maxOutputLength: Number.MAX_SAFE_INTEGER,
    },
  },
});
