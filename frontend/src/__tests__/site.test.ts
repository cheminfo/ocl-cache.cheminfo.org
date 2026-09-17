import { ECOSYSTEM_SITES } from 'react-cheminfo/core';
import { expect, test } from 'vitest';

import { SITE } from '../site.ts';

test('this site is deliberately not one of the family, and nothing links to it', () => {
  const ids = ECOSYSTEM_SITES.map((site) => site.id);

  expect(ids).not.toContain('ocl-cache');
  expect(ECOSYSTEM_SITES.map((site) => site.host)).not.toContain(SITE.host);
});

test('the record still carries everything the shared helpers read', () => {
  expect(SITE.host).toBe('ocl-cache.cheminfo.org');
  expect(SITE.repository).toBe('https://github.com/cheminfo/ocl-cache');
  expect(SITE.name).toStrictEqual({ lead: 'ocl-', alt: 'cache' });
  expect(SITE.brand).toBe('#334155');
  expect(SITE.brandAlt).toBe('#b45309');
});
