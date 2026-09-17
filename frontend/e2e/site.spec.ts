import { expect, test } from '@playwright/test';

test('the root renders the tool, not a redirect to the documentation', async ({
  page,
}) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Molecule property cache/);
  await expect(page.getByTestId('search-input')).toBeVisible();
});

test('the brand links home', async ({ page }) => {
  await page.goto('/statistics');
  await page.locator('a.brand').click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('search-input')).toBeVisible();
});

test('a SMILES is looked up and every property is shown', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('search-input').fill('CCO');
  await page.getByTestId('search-submit').click();

  const card = page.getByTestId('molecule-card');
  await expect(card).toBeVisible();
  // Ethanol: the formula, the exact mass and the idCode are all exact values,
  // so a wrong lookup cannot pass this.
  await expect(card).toContainText('eMHAIh@');
  await expect(card).toContainText('46.0419');
  await expect(card).toContainText('Molecular weight');
});

test('an idCode is recognised without being told what it is', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('search-input').fill('eMHAIh@');
  await page.getByTestId('search-submit').click();

  await expect(page.getByTestId('molecule-card')).toContainText('C2H6O', {
    useInnerText: true,
  });
});

test('the statistics page says how many molecules are cached', async ({
  page,
}) => {
  await page.goto('/statistics');

  await expect(page).toHaveTitle(/Statistics/);
  await expect(page.getByTestId('stat-tiles')).toContainText(
    'Molecules cached',
  );
});

test('the About is a routed page with its own title', async ({ page }) => {
  const response = await page.goto('/about');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/About/);
  await expect(page.getByRole('heading', { name: /Built on/i })).toBeVisible();
});

test('an embedded page renders no header at all', async ({ page }) => {
  await page.goto('/?embed=1');

  await expect(page.getByTestId('search-input')).toBeVisible();
  await expect(page.locator('header.app-header')).toHaveCount(0);
});

test('robots and the sitemap are served, and the sitemap lists every page', async ({
  request,
}) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap:');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ['/', '/statistics', '/about']) {
    expect(xml).toContain(`<loc>https://ocl-cache.cheminfo.org${path}`);
  }
});

test('an address the site does not know still serves the page', async ({
  page,
}) => {
  const response = await page.goto('/nothing-here');

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId('search-input')).toBeVisible();
});

test('the API still answers its original routes', async ({ request }) => {
  const response = await request.get('/v1/fromSmiles?smiles=CCOCC');

  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    result: { idCode: string; mf: string };
  };
  expect(body.result.idCode).toBe('gJQ@@eKU@@');
  expect(body.result.mf).toBe('C4H10O');
});

test('the cache offers no search that walks it', async ({ request }) => {
  const response = await request.get('/v1/substructure?q=c1ccccc1');

  expect(response.status()).toBe(404);
});
