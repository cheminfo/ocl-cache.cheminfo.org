import { expect, test } from 'vitest';

import { atomCountsText, copyableText } from '../copyableValue.ts';

test('a value written as text is copied exactly as it is written', () => {
  expect(copyableText('46.0419')).toBe('46.0419');
  expect(copyableText('eMHAIh@')).toBe('eMHAIh@');
  expect(copyableText(' 1 234 ')).toBe('1 234');
  expect(copyableText(0)).toBe('0');
});

test('a value the cache does not hold is not a copy target', () => {
  expect(copyableText('—')).toBeNull();
  expect(copyableText('')).toBeNull();
  expect(copyableText(' '.repeat(3))).toBeNull();
  expect(copyableText(null)).toBeNull();
  expect(copyableText(undefined)).toBeNull();
});

test('a drawn value is copied through the copy text of its row, not its markup', () => {
  expect(copyableText({ type: 'span', props: {}, key: null })).toBeNull();
});

test('the atom counts are copied as one line, in the order they are drawn', () => {
  expect(atomCountsText({ C: 2, H: 6, O: 1 })).toBe('C2 H6 O1');
  expect(atomCountsText({ C: 8, H: 10, N: 4, O: 2 })).toBe('C8 H10 N4 O2');
});

test('a molecule with no atom counts has nothing to copy', () => {
  expect(atomCountsText({})).toBeUndefined();
});
