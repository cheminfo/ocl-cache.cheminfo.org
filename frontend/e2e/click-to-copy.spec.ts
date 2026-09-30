/**
 * What a click on a value does: put it on the clipboard, exactly as the page
 * writes it.
 *
 * The molecule asserted here is the ethanol the lookup suite already pins, so
 * a difference is a defect in the copying rather than a disagreement about
 * chemistry.
 */

import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** Ethanol, as the cache holds it. */
const ETHANOL = {
  mf: 'C2H6O',
  em: '46.0419',
  idCode: 'eMHAIh@',
  atoms: 'C2 H6 O1',
};

/**
 * The cell of the molecule card that holds one property.
 * @param page - The page under test.
 * @param label - The row's name, as the table writes it.
 * @returns The value cell.
 */
function propertyValue(page: Page, label: string): Locator {
  return page
    .getByTestId('molecule-card')
    .locator('tr', { has: page.locator('th', { hasText: label }) })
    .locator('td');
}

/**
 * The value of one tile of the statistics page.
 * @param page - The page under test.
 * @param label - The tile's name.
 * @returns The value element.
 */
function tileValue(page: Page, label: string): Locator {
  return page
    .getByTestId('stat-tiles')
    .locator('.stat-tile', { hasText: label })
    .locator('.stat-tile__value');
}

/**
 * Click a value and read back what it put on the clipboard.
 * @param locator - The click-to-copy element.
 * @returns The clipboard text.
 */
async function copyByClick(locator: Locator): Promise<string> {
  await locator.click();
  await expect(locator).toHaveAttribute('data-copy', 'copied');
  return locator.page().evaluate(() => navigator.clipboard.readText());
}

/**
 * Look up a molecule and wait for its card.
 * @param page - The page under test.
 * @param query - What to type in the search bar.
 */
async function lookUp(page: Page, query: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('search-input').fill(query);
  await page.getByTestId('search-submit').click();
  await expect(page.getByTestId('molecule-card')).toBeVisible();
}

test('the identifiers are copied by a click, each one on its own', async ({
  page,
}) => {
  await lookUp(page, 'CCO');

  const idCode = propertyValue(page, 'idCode');
  await expect(idCode).toHaveAttribute(
    'title',
    `Copy the idCode (${ETHANOL.idCode})`,
  );
  // The cursor is the whole hover affordance: the family's clipboard pointer,
  // falling back to the native copy cursor.
  expect(
    await idCode.evaluate((element) => window.getComputedStyle(element).cursor),
  ).toMatch(/^url\(.+\) 1 1, copy$/);
  expect(await copyByClick(idCode)).toBe(ETHANOL.idCode);

  // Ethanol has no stereocentre and no tautomer, so both canonical forms are
  // the idCode itself — each cell still copies its own value.
  expect(await copyByClick(propertyValue(page, 'No stereo,'))).toBe(
    ETHANOL.idCode,
  );
});

test('a mass copies the number, and the formula its plain string', async ({
  page,
}) => {
  await lookUp(page, 'CCO');

  expect(await copyByClick(propertyValue(page, 'Monoisotopic mass'))).toBe(
    ETHANOL.em,
  );

  const formula = propertyValue(page, 'Molecular formula');
  // What is on screen is drawn by `<MF>`: the counts are real subscripts.
  await expect(formula.locator('sub')).toHaveText(['2', '6']);
  expect(await copyByClick(formula)).toBe(ETHANOL.mf);

  expect(await copyByClick(propertyValue(page, 'Atoms'))).toBe(ETHANOL.atoms);
});

test('a headline figure is copied by a click, and a figure nobody has computed is not', async ({
  page,
}) => {
  await lookUp(page, 'CCO');
  await page.goto('/statistics');

  const total = tileValue(page, 'Molecules cached');
  const shown = ((await total.textContent()) ?? '').trim();
  expect(shown).toMatch(/^\d/);
  expect(await copyByClick(total)).toBe(shown);

  // Nothing but the count is known until the rollup has run, and a dash is
  // nothing to take away.
  const distinct = tileValue(page, 'Distinct structures');
  await expect(distinct).toHaveText('—');
  await expect(distinct).not.toHaveClass(/click-to-copy/);
});
