import { defineConfig, globalIgnores } from 'eslint/config';
import react from 'eslint-config-zakodium/react';
import ts from 'eslint-config-zakodium/ts';
import unicorn from 'eslint-config-zakodium/unicorn';

export default defineConfig(
  globalIgnores([
    '**/coverage',
    '**/dist',
    '**/playwright-report',
    '**/test-results',
    'e2e-data',
  ]),
  ts,
  unicorn,
  {
    rules: {
      'no-await-in-loop': 'off',
      // TypeBox and Fastify use uppercase non-constructor calls.
      'new-cap': ['error', { capIsNew: false }],
    },
  },
  {
    files: ['backend/src/scripts/**'],
    rules: {
      'no-console': 'off',
    },
  },
  { files: ['frontend/**'], extends: [react] },
);
