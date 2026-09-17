import { availableParallelism } from 'node:os';

import { afterEach, expect, test } from 'vitest';

import { workerThreadCount } from '../workerThreadCount.ts';

afterEach(() => {
  delete process.env.WORKER_THREADS;
});

test('WORKER_THREADS wins over anything the machine reports', () => {
  process.env.WORKER_THREADS = '3';
  expect(workerThreadCount()).toBe(3);
});

test('a blank or nonsensical WORKER_THREADS is ignored', () => {
  for (const value of ['', ' ', '0', '-2', '2.5', 'many']) {
    process.env.WORKER_THREADS = value;
    expect(workerThreadCount()).toBeGreaterThan(0);
  }
});

test('never asks for more threads than the machine can run at once', () => {
  // The property the pool depends on: under a quota the count is the quota,
  // and without one it is the parallelism — never more than the latter, which
  // is what an unbounded pool did before.
  const count = workerThreadCount();
  expect(Number.isInteger(count)).toBe(true);
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(availableParallelism());
});
