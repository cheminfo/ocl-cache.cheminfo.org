import { expect, test } from 'vitest';

import { ROUTES, injectPageMeta, pageMetaFor } from '../pageMeta.ts';

const PAGE = '<html><head><!--cheminfo:head--></head><body></body></html>';
const ORIGIN = 'https://ocl-cache.cheminfo.org';

test('each page is named on its own, and no two share a description', () => {
  expect(pageMetaFor('/').title).toBe(
    'Molecule property cache — look up a structure',
  );
  expect(pageMetaFor('/statistics').title).toBe(
    'Statistics — what the cache holds',
  );
  expect(pageMetaFor('/about').title).toBe(
    'About — what computes the properties, and under what licence',
  );

  const descriptions = ROUTES.map((route) => route.description);
  expect(new Set(descriptions).size).toBe(ROUTES.length);
});

test('an address the tool does not know is described as the search', () => {
  expect(pageMetaFor('/nothing-here')).toStrictEqual(pageMetaFor('/'));
});

test('a trailing slash names the same page', () => {
  expect(pageMetaFor('/statistics/').title).toBe(
    pageMetaFor('/statistics').title,
  );
});

test('the canonical is absolute and drops the query string', () => {
  const html = injectPageMeta(PAGE, {
    url: '/statistics?embed=1&hide=pages',
    origin: ORIGIN,
  });

  expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/statistics"`);
  expect(html).not.toContain('embed=1');
});

test('the head carries the social card and the structured data', () => {
  const html = injectPageMeta(PAGE, { url: '/', origin: ORIGIN });

  expect(html).toContain('<meta property="og:title"');
  expect(html).toContain(
    '<meta name="twitter:card" content="summary_large_image"',
  );
  expect(html).toContain('"@type": "WebApplication"');
});

test('a host carrying markup is refused rather than written into the head', () => {
  // The origin comes from the Host header and is therefore untrusted. It is
  // rejected outright, so nothing of it can reach the page at all.
  expect(() =>
    injectPageMeta(PAGE, {
      url: '/',
      origin: 'https://evil"><script>alert(1)</script>',
    }),
  ).toThrow('an origin is an absolute address');
});
