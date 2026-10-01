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

test('the header reaches the API documentation', async ({ page, request }) => {
  await page.goto('/');

  const link = page.getByRole('link', { name: 'API', exact: true });
  await expect(link).toHaveAttribute('href', '/docs');
  await expect(link).toHaveAttribute('target', '_blank');

  const docs = await request.get('/docs/');
  expect(docs.status()).toBe(200);
  expect(await docs.text()).toContain('<div id="swagger-ui">');

  const specResponse = await request.get('/docs/json');
  const spec = (await specResponse.json()) as {
    paths: Record<string, unknown>;
  };
  expect(Object.keys(spec.paths)).toContain('/v1/fromSmiles');
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

test('the cache searches by structure, and never unbounded', async ({
  request,
}) => {
  const response = await request.get('/v1/search?q=c1ccccc1&limit=5');
  expect(response.status()).toBe(200);

  const body = (await response.json()) as { results: unknown[] };
  expect(body.results.length).toBeLessThanOrEqual(5);

  // A link cannot ask for more than one page: an exhaustive scan of this table
  // is minutes, so the bound is the route's, not the caller's.
  const greedy = await request.get('/v1/search?limit=100000');
  expect(greedy.status()).toBe(400);
});
