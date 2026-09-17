import { expect, test } from 'vitest';

import { injectTrackingScript } from '../injectTrackingScript.ts';

const SNIPPET =
  '<script defer src="https://datami.cheminfo.org/script.js" data-website-id="x"></script>';
const PAGE = '<html><head><title>t</title></head><body></body></html>';

test('the snippet is inserted at the end of the head', () => {
  const html = injectTrackingScript(PAGE, SNIPPET);

  expect(html).toBe(
    `<html><head><title>t</title>${SNIPPET}\n</head><body></body></html>`,
  );
});

test('an unset or blank value leaves the page exactly as it was', () => {
  expect(injectTrackingScript(PAGE)).toBe(PAGE);
  expect(injectTrackingScript(PAGE, ' '.repeat(3))).toBe(PAGE);
});

test('the snippet is taken verbatim, whatever it contains', () => {
  const odd = '<script>window.x = "a & b < c";</script>';

  expect(injectTrackingScript(PAGE, odd)).toContain(odd);
});

test('a page that already carries it is not given a second copy', () => {
  const once = injectTrackingScript(PAGE, SNIPPET);

  expect(injectTrackingScript(once, SNIPPET)).toBe(once);
});

test('a page with no head still gets the snippet', () => {
  const html = injectTrackingScript('<p>no head</p>', SNIPPET);

  expect(html).toBe(`<p>no head</p>\n${SNIPPET}\n`);
});
