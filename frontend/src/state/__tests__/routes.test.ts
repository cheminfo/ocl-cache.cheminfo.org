import { expect, test } from 'vitest';

import { PAGE_ROUTES, pathOf, tabOf } from '../routes.ts';

test('the three pages are addresses, and the tool is at the root', () => {
  expect(PAGE_ROUTES.map((route) => route.path)).toStrictEqual([
    '/',
    '/statistics',
    '/about',
  ]);
});

test('every page is titled and described on its own', () => {
  const titles = PAGE_ROUTES.map((route) => route.title);
  const descriptions = PAGE_ROUTES.map((route) => route.description);

  expect(new Set(titles).size).toBe(PAGE_ROUTES.length);
  expect(new Set(descriptions).size).toBe(PAGE_ROUTES.length);
});

test('a page and its address agree in both directions', () => {
  expect(pathOf('search')).toBe('/');
  expect(pathOf('statistics')).toBe('/statistics');
  expect(pathOf('about')).toBe('/about');

  expect(tabOf('/')).toBe('search');
  expect(tabOf('/statistics')).toBe('statistics');
  expect(tabOf('/about')).toBe('about');
});

test('an address the site does not know opens the tool', () => {
  expect(tabOf('/nothing-here')).toBe('search');
  expect(tabOf('/statistics/extra')).toBe('statistics');
});
