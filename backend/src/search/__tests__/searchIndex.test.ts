import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import * as OCL from 'openchemlib';
import { MoleculesDBSQLite } from 'openchemlib-sqlite';
import { afterEach, expect, test } from 'vitest';

import { DB } from '../../db/DB.ts';
import { prepareDB } from '../../db/dbFactory.ts';
import { getInfoFromSmiles } from '../../db/getInfoFromSmiles.ts';
import { highestIndexed, indexMolecules } from '../indexMolecules.ts';
import type { SearchIndex } from '../searchIndex.ts';

const SAMPLES = [
  'c1ccccc1',
  'c1ccc2ccccc2c1',
  'CCOCC',
  'CC(=O)N',
  'c1ccncc1',
  'N[C@@H](C)C(=O)O',
];

let directory: string | undefined;

afterEach(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
  directory = undefined;
});

/**
 * A cache holding the samples, and an index over it in a database of its own.
 *
 * Both are real files and the index attaches the cache, because that
 * arrangement is the design under test: the cache's schema is never touched and
 * every `ocl_*` table is created in the other file.
 * @returns the cache and the index
 */
async function cacheAndIndex(): Promise<{ db: DB; index: SearchIndex }> {
  directory = mkdtempSync(join(tmpdir(), 'ocl-cache-search-'));
  const cacheFile = join(directory, 'db.sqlite');

  const cacheConnection = new DatabaseSync(cacheFile);
  await prepareDB(cacheConnection);
  const db = new DB(cacheConnection);
  for (const smiles of SAMPLES) {
    await getInfoFromSmiles(smiles, db);
  }

  const indexConnection = new DatabaseSync(join(directory, 'search.sqlite'));
  indexConnection.exec(`ATTACH DATABASE '${cacheFile}' AS mol`);
  const molDB = new MoleculesDBSQLite(indexConnection, OCL, {
    entriesTable: 'mol.molecules',
    pkColumn: 'rowid',
    idCodeColumn: 'idCode',
    mwColumn: 'mw',
    trustMwColumn: true,
    poolSize: 1,
    searchCacheSize: 0,
  });
  molDB.migrate();
  return { db, index: { molDB, db: indexConnection } };
}

const idCodeOf = (smiles: string) =>
  OCL.Molecule.fromSmiles(smiles).getIDCode();

test('indexing adds every molecule the index does not hold', async () => {
  const { db, index } = await cacheAndIndex();

  const pass = await indexMolecules(db, index);

  expect(pass.indexed).toBe(SAMPLES.length);
  expect(index.molDB.count()).toBe(SAMPLES.length);
  expect(highestIndexed(index)).toBe(SAMPLES.length);
});

test('a second pass has nothing to do, and a new molecule is picked up', async () => {
  const { db, index } = await cacheAndIndex();
  await indexMolecules(db, index);

  const second = await indexMolecules(db, index);
  expect(second.indexed).toBe(0);

  await getInfoFromSmiles('c1ccc(cc1)O', db);
  const pass = await indexMolecules(db, index);

  expect(pass.indexed).toBe(1);
  expect(index.molDB.count()).toBe(SAMPLES.length + 1);
});

test('the index is built from the stored fingerprint, not recomputed', async () => {
  const { db, index } = await cacheAndIndex();
  await indexMolecules(db, index);

  // The words the index holds must equal the blob the cache stores, because the
  // one was handed over as the other. A mismatch would screen out real hits
  // with nothing to show why.
  const statement = index.db.prepare(
    `SELECT m.ssIndex AS blob, s.ss_index0, s.ss_index1, s.ss_index2, s.ss_index3,
       s.ss_index4, s.ss_index5, s.ss_index6, s.ss_index7
     FROM mol.molecules m JOIN ocl_ss_index s ON s.entry_id = m.rowid WHERE m.rowid = ?`,
  );
  statement.setReadBigInts(true);

  for (let rowid = 1; rowid <= SAMPLES.length; rowid++) {
    const row = statement.get(rowid) as Record<string, unknown>;
    const words = Array.from(
      { length: 8 },
      (_, i) => row[`ss_index${i}`] as bigint,
    );
    const rebuilt = new Uint8Array(new BigInt64Array(words).buffer);

    expect([...rebuilt]).toStrictEqual([...(row.blob as Uint8Array)]);
  }
});

test('substructure search finds the superstructures and nothing else', async () => {
  const { db, index } = await cacheAndIndex();
  await indexMolecules(db, index);

  const response = await index.molDB.search(idCodeOf('c1ccccc1'), {
    mode: 'substructure',
    format: 'idCode',
  });

  // Benzene is in benzene and in naphthalene, and in neither of the aliphatics
  // nor in pyridine, whose ring has a nitrogen.
  expect(response.results.map((hit) => hit.idCode).toSorted()).toStrictEqual(
    [idCodeOf('c1ccccc1'), idCodeOf('c1ccc2ccccc2c1')].toSorted(),
  );
});

test('a bounded search stops early and says it was cut short', async () => {
  const { db, index } = await cacheAndIndex();
  await indexMolecules(db, index);

  const response = await index.molDB.search(idCodeOf('c1ccccc1'), {
    mode: 'substructure',
    format: 'idCode',
    maxResults: 1,
  });

  expect(response.results).toHaveLength(1);
  expect(response.partial).toBe(true);
});

test('the identity modes answer once the hashes are built', async () => {
  const { db, index } = await cacheAndIndex();
  await indexMolecules(db, index);

  // Before the hashes exist, an identity search is simply empty — not wrong.
  const before = await index.molDB.search(idCodeOf('N[C@H](C)C(=O)O'), {
    mode: 'exactNoStereo',
    format: 'idCode',
  });
  expect(before.results).toHaveLength(0);

  await index.molDB.backfillHashes({ poolSize: 1 });

  // The other enantiomer of the stored alanine, which only the no-stereo hash
  // merges with it.
  const after = await index.molDB.search(idCodeOf('N[C@H](C)C(=O)O'), {
    mode: 'exactNoStereo',
    format: 'idCode',
  });
  expect(after.results.map((hit) => hit.idCode)).toStrictEqual([
    idCodeOf('N[C@@H](C)C(=O)O'),
  ]);
});
