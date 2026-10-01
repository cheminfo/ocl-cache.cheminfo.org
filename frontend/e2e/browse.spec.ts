import { expect, test } from '@playwright/test';

test('the browse page is a routed address with its own head', async ({
  page,
}) => {
  const response = await page.goto('/browse');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Browse the cache/);
  // The origin depends on how the suite was started, so what is asserted is
  // the part the route owns: its own path, and no query string.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/browse$/,
  );
});

test('it opens on the molecules themselves, not on an empty box', async ({
  page,
  request,
}) => {
  // The suite starts on an empty scratch cache, so a molecule is put in it
  // first: an empty cache has nothing to browse, and saying so is also correct.
  for (const smiles of ['CCO', 'c1ccccc1', 'CC(=O)Oc1ccccc1C(=O)O']) {
    const response = await request.get(
      `/v1/lookup?q=${encodeURIComponent(smiles)}`,
    );
    expect(response.status()).toBe(200);
  }

  await page.goto('/browse');

  // A cache is worth looking at, so the grid is the landing state.
  await expect(page.locator('.browse-grid')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.browse-cell').first()).toBeVisible();
  await expect(page.getByText('The search did not run')).toBeHidden();
});

test('an empty cache says so rather than showing an empty grid', async ({
  page,
}) => {
  // A formula nothing has: the same path as an empty cache, without needing one.
  await page.goto('/browse');
  await page.getByPlaceholder('C6H6').fill('C999H999');
  await page.getByPlaceholder('C6H6').press('Enter');

  await expect(page.getByText('Nothing matched')).toBeVisible({
    timeout: 30_000,
  });
});

test('every property can be bounded, and a formula asked for exactly', async ({
  page,
}) => {
  await page.goto('/browse');

  for (const label of [
    'Molecular weight',
    'logP',
    'logS',
    'Polar surface area',
    'H-bond acceptors',
    'Molecular formula',
  ]) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
  }
});

test('the structure filter offers every way of matching a drawing', async ({
  page,
}) => {
  await page.goto('/browse');
  await page.getByRole('button', { name: /Filter by structure/ }).click();

  for (const label of [
    'Contains',
    'Similar to',
    'Is exactly',
    'Any stereoisomer',
    'Any tautomer',
  ]) {
    await expect(
      page.getByRole('button', { name: label, exact: true }),
    ).toBeVisible();
  }
});

test('the pager is there, and Previous is off on the first page', async ({
  page,
}) => {
  await page.goto('/browse');
  await expect(page.locator('.browse-grid')).toBeVisible({ timeout: 30_000 });

  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await expect(page.getByText('First page')).toBeVisible();
});

test('the menu lists the page, and the brand still goes home', async ({
  page,
}) => {
  await page.goto('/browse');

  await expect(
    page.getByRole('link', { name: 'Browse', exact: true }),
  ).toBeVisible();
  await page.locator('a.brand').click();
  await expect(page).toHaveURL(/\/$/);
});
