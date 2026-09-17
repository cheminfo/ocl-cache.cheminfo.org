import { expect, test } from 'vitest';

import { barsOfHistogram, barsOfValues } from '../countBars.ts';

test('a bucket becomes one bar standing at its middle', () => {
  const bars = barsOfHistogram([
    { from: 0, to: 25, count: 3 },
    { from: 25, to: 50, count: 7 },
  ]);

  expect(bars).toStrictEqual([
    { position: 12.5, label: '0 to 25', count: 3 },
    { position: 37.5, label: '25 to 50', count: 7 },
  ]);
});

test('the empty buckets at both ends are dropped, the ones between are kept', () => {
  const bars = barsOfHistogram([
    { from: 0, to: 10, count: 0 },
    { from: 10, to: 20, count: 4 },
    { from: 20, to: 30, count: 0 },
    { from: 30, to: 40, count: 2 },
    { from: 40, to: 50, count: 0 },
  ]);

  expect(bars.map((bar) => bar.count)).toStrictEqual([4, 0, 2]);
  expect(bars[0]?.label).toBe('10 to 20');
});

test('a histogram nothing fell into draws nothing', () => {
  expect(
    barsOfHistogram([
      { from: 0, to: 10, count: 0 },
      { from: 10, to: 20, count: 0 },
    ]),
  ).toStrictEqual([]);
});

test('a fractional edge keeps one decimal, a whole one stays whole', () => {
  const bars = barsOfHistogram([{ from: -0.5, to: 0, count: 1 }]);

  expect(bars[0]?.label).toBe('-0.5 to 0');
});

test('an exact value becomes a bar standing on it', () => {
  const bars = barsOfValues([
    { value: 0, count: 9 },
    { value: 3, count: 1 },
  ]);

  expect(bars).toStrictEqual([
    { position: 0, label: '0', count: 9 },
    { position: 3, label: '3', count: 1 },
  ]);
});
