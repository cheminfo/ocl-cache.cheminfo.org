import { aboutProblems } from 'react-cheminfo/core';
import { expect, test } from 'vitest';

import { ABOUT } from '../about.ts';
import { SITE } from '../site.ts';

test('the About record says everything it has to, and nothing too long', () => {
  expect(aboutProblems(ABOUT)).toStrictEqual([]);
});

test('the About names this site by its own record, not by a registry id', () => {
  // ocl-cache is deliberately absent from ECOSYSTEM_SITES, so the About is
  // given the record rather than an id the registry could resolve.
  expect(ABOUT.siteId).toBe(SITE);
  expect(SITE.host).toBe('ocl-cache.cheminfo.org');
});
