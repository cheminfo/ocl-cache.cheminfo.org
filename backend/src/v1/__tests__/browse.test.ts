import { join } from 'node:path';

import { afterAll, beforeAll, expect, test } from 'vitest';

import { buildApp } from '../../app.ts';
import type { DB } from '../../db/DB.ts';
import { _setInstance, getTempDB } from '../../db/dbFactory.ts';
import { getInfoFromSmiles } from '../../db/getInfoFromSmiles.ts';
import type { FastifyTyped } from '../../types.ts';

const FIXTURE_ROOT = join(import.meta.dirname, '../../__tests__/fixture');

/** Light to heavy, so a weight bound has something to cut. */
const SAMPLES = [
  'C', // methane, 16
  'CCO', // ethanol, 46
  'c1ccccc1', // benzene, 78
  'CC(=O)Oc1ccccc1C(=O)O', // aspirin, 180
  'CN1C=NC2=C1C(=O)N(C)C(=O)N2C', // caffeine, 194
  'c1ccc2ccccc2c1', // naphthalene, 128
];

let app: FastifyTyped;
let db: DB;

beforeAll(async () => {
  db = await getTempDB();
  _setInstance(db);
  for (const smiles of SAMPLES) {
    await getInfoFromSmiles(smiles, db);
  }
  app = await buildApp({ frontendRoot: FIXTURE_ROOT, logger: false });
}, 60000);

afterAll(async () => {
  await app.close();
  _setInstance(undefined);
});

/** What the route answers, as this file reads it. */
interface BrowseBody {
  results: Array<{ idCode: string; mf?: string; mw?: number }>;
  total: number | null;
  next: string | null;
}

/**
 * Ask the search route.
 * @param query - the query string, without the leading `?`
 * @returns the status and the decoded answer
 */
async function browse(
  query: string,
): Promise<{ status: number; body: BrowseBody }> {
  const response = await app.inject({
    method: 'GET',
    url: `/v1/search?${query}`,
  });
  return {
    status: response.statusCode,
    body: response.json<BrowseBody>(),
  };
}

test('with no query it browses everything, in insertion order', async () => {
  const { status, body } = await browse('');

  expect(status).toBe(200);
  expect(body.results).toHaveLength(SAMPLES.length);
  expect(body.results[0]?.mf).toBe('CH4');
  // It does not count: counting this table is a walk of every row.
  expect(body.total).toBeNull();
  expect(body.next).toBeNull();
});

test('a page carries a cursor, and the next page carries on from it', async () => {
  const first = await browse('limit=2');

  expect(first.body.results).toHaveLength(2);
  expect(first.body.next).not.toBeNull();

  const second = await browse(`limit=2&cursor=${first.body.next}`);

  expect(second.body.results).toHaveLength(2);
  // No molecule appears on two pages.
  const seen = new Set(first.body.results.map((hit) => hit.idCode));
  for (const hit of second.body.results) {
    expect(seen.has(hit.idCode)).toBe(false);
  }
});

test('the last page says there is no next one', async () => {
  const { body } = await browse(`limit=${SAMPLES.length}`);

  expect(body.results).toHaveLength(SAMPLES.length);
  expect(body.next).toBeNull();
});

test('a weight range keeps only what falls inside it', async () => {
  const { body } = await browse('mwMin=100&mwMax=190');

  // Naphthalene (128) and aspirin (180); not caffeine (194) nor benzene (78).
  expect(
    body.results
      .map((hit) => hit.mf)
      .toSorted((a, b) => (a ?? '').localeCompare(b ?? '')),
  ).toStrictEqual(['C10H8', 'C9H8O4']);
});

test('bounds combine, and a formula matches exactly', async () => {
  const byFormula = await browse('mf=C6H6');
  expect(byFormula.body.results.map((hit) => hit.mf)).toStrictEqual(['C6H6']);

  const narrow = await browse('mwMin=100&donorsMax=0');
  for (const hit of narrow.body.results) {
    expect(hit.mw).toBeGreaterThanOrEqual(100);
  }
  // Aspirin has a donor, so a zero-donor bound must exclude it.
  expect(narrow.body.results.map((hit) => hit.mf)).not.toContain('C9H8O4');
});

test('a bound nothing satisfies is an empty page, not an error', async () => {
  const { status, body } = await browse('mwMin=100000');

  expect(status).toBe(200);
  expect(body.results).toStrictEqual([]);
  expect(body.next).toBeNull();
});

test('a query that is not a molecule is refused', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/search?q=%20%20not%20a%20molecule%20%20&kind=smiles',
  });

  expect(response.statusCode).toBe(400);
});
