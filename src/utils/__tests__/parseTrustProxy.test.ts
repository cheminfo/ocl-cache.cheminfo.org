import { expect, test } from 'vitest';

import { parseTrustProxy } from '../parseTrustProxy.ts';

test('unset or blank means no proxy is trusted', () => {
  expect(parseTrustProxy(undefined)).toBe(false);
  expect(parseTrustProxy('')).toBe(false);
  expect(parseTrustProxy(' '.repeat(3))).toBe(false);
  expect(parseTrustProxy('false')).toBe(false);
});

test('true trusts any peer', () => {
  expect(parseTrustProxy('true')).toBe(true);
});

test('a bare number is a hop count', () => {
  expect(parseTrustProxy('2')).toBe(2);
});

test('an address, a CIDR or a list is passed through trimmed', () => {
  expect(parseTrustProxy('192.168.1.5')).toBe('192.168.1.5');
  expect(parseTrustProxy('  10.0.0.0/8  ')).toBe('10.0.0.0/8');
  expect(parseTrustProxy('192.168.1.5,10.0.0.0/8')).toBe(
    '192.168.1.5,10.0.0.0/8',
  );
});
