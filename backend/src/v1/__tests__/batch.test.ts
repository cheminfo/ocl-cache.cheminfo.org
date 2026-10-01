import { join } from 'node:path';

import { afterAll, beforeAll, expect, test } from 'vitest';

import { buildApp } from '../../app.ts';
import type { DB } from '../../db/DB.ts';
import { _setInstance, getTempDB } from '../../db/dbFactory.ts';
import type { FastifyTyped } from '../../types.ts';
import { MAX_BATCH_QUERIES } from '../schemas.ts';

const FIXTURE_ROOT = join(import.meta.dirname, '../../__tests__/fixture');

let app: FastifyTyped;
let db: DB;

beforeAll(async () => {
  db = await getTempDB();
  _setInstance(db);
  app = await buildApp({ frontendRoot: FIXTURE_ROOT, logger: false });
}, 30000);

afterAll(async () => {
  await app.close();
  _setInstance(undefined);
});

/**
 * Ask the batch route, and hand back the parsed body.
 * @param body - what to post
 * @returns the status and the decoded answer
 */
async function postBatch(body: unknown) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/batch',
    payload: body as object,
  });
  return { status: response.statusCode, body: response.json() };
}

test(
  'answers every query of a batch, in the order they were sent',
  { timeout: 60000 },
  async () => {
    const { status, body } = await postBatch({
      queries: ['CCOCC', 'CCC', 'gJQ@@eKU@@'],
    });

    expect(status).toBe(200);
    expect(body.results).toHaveLength(3);
    expect(
      body.results.map((entry: { query: string }) => entry.query),
    ).toStrictEqual(['CCOCC', 'CCC', 'gJQ@@eKU@@']);
    expect(body.results[0].result.idCode).toBe('gJQ@@eKU@@');
    expect(body.results[0].kind).toBe('smiles');
    expect(body.results[1].result.idCode).toBe('eM@Hz@');
    expect(body.results[1].result.mf).toBe('C3H8');
    expect(body.results[2].kind).toBe('idCode');

    // `CCOCC` and `gJQ@@eKU@@` are the same molecule under two spellings, so
    // neither was in the cache when the batch began and both say so.
    expect(body.results[0].cached).toBe(false);
    expect(body.results[2].cached).toBe(false);
    expect(body.summary).toStrictEqual({
      total: 3,
      cached: 0,
      computed: 3,
      failed: 0,
    });
    // Two molecules, three queries: the repeat was not computed twice.
    expect(db.highestRowId.getRequired().rowid).toBe(2);
  },
);

test(
  'a structure a batch names twice is computed once',
  { timeout: 60000 },
  async () => {
    const before = db.highestRowId.getRequired().rowid ?? 0;

    const { status, body } = await postBatch({
      // The same molecule written three ways.
      queries: ['CCCO', 'OCCC', 'C(O)CC'],
    });

    expect(status).toBe(200);
    expect(db.highestRowId.getRequired().rowid).toBe(before + 1);
    const idCodes = body.results.map(
      (entry: { result: { idCode: string } }) => entry.result.idCode,
    );
    expect(new Set(idCodes).size).toBe(1);
    expect(body.summary.total).toBe(3);
  },
);

test('a molecule already in the cache is reported as cached', async () => {
  const { body } = await postBatch({ queries: ['CCC'] });

  expect(body.results[0].cached).toBe(true);
  expect(body.summary).toStrictEqual({
    total: 1,
    cached: 1,
    computed: 0,
    failed: 0,
  });
});

test(
  'a query that is not a molecule fails on its own',
  { timeout: 60000 },
  async () => {
    const { status, body } = await postBatch({
      queries: ['not a molecule at all', 'CCC'],
    });

    expect(status).toBe(200);
    expect(body.results[0].result).toBeNull();
    expect(body.results[0].error).toBeTypeOf('string');
    expect(body.results[0].kind).toBeUndefined();
    expect(body.results[1].result.idCode).toBe('eM@Hz@');
    expect(body.summary.failed).toBe(1);
    expect(body.summary.total).toBe(2);
  },
);

test('a cache-only batch reports a miss rather than computing it', async () => {
  const { status, body } = await postBatch({
    queries: ['c1ccccc1C(=O)OCCCCCC'],
    cacheOnly: true,
  });

  expect(status).toBe(200);
  expect(body.results).toHaveLength(1);
  expect(body.results[0].result).toBeNull();
  expect(body.results[0].cached).toBe(false);
  expect(body.results[0].error).toBeUndefined();
  expect(body.summary).toStrictEqual({
    total: 1,
    cached: 0,
    computed: 0,
    failed: 0,
  });
});

test('an empty batch is refused', async () => {
  const { status } = await postBatch({ queries: [] });
  expect(status).toBe(400);
});

test('a batch larger than the cap is refused rather than truncated', async () => {
  const { status } = await postBatch({
    queries: Array.from({ length: MAX_BATCH_QUERIES + 1 }, () => 'CCC'),
  });
  expect(status).toBe(400);
});
