import { expect, test } from 'vitest';

import type { MoleculeInfo } from '../../MoleculeInfo.ts';
import { getTempDB } from '../dbFactory.ts';
import { WRITE_BATCH_SIZE, insertInfoBatch } from '../insertInfoBatch.ts';

test('writes every row of a batch, and reads them back', async () => {
  const db = await getTempDB();

  const written = insertInfoBatch(
    [
      { info: sampleInfo('aaa'), createdAt: 1759000000 },
      { info: sampleInfo('bbb'), createdAt: 1759000001 },
      { info: sampleInfo('ccc'), createdAt: 1759000002 },
    ],
    db,
  );

  expect(written).toBe(3);
  expect(db.highestRowId.getRequired().rowid).toBe(3);
  const row = db.searchIDCode.get('bbb');
  expect(row?.createdAt).toBe(1759000001);
  expect(row?.mf).toBe('C3H8');
});

test('an empty batch writes nothing and opens no transaction', async () => {
  const db = await getTempDB();

  expect(insertInfoBatch([], db)).toBe(0);
  expect(db.highestRowId.getRequired().rowid).toBeNull();
});

test('a row that cannot be written loses only itself', async () => {
  const db = await getTempDB();

  const written = insertInfoBatch(
    [
      { info: sampleInfo('dup'), createdAt: 1759000000 },
      // The same idCode twice: the second violates the primary key.
      { info: sampleInfo('dup'), createdAt: 1759000001 },
      { info: sampleInfo('kept'), createdAt: 1759000002 },
    ],
    db,
  );

  expect(written).toBe(2);
  expect(db.searchIDCode.get('dup')?.createdAt).toBe(1759000000);
  expect(db.searchIDCode.get('kept')?.createdAt).toBe(1759000002);
});

test('a batch longer than one transaction is split across several', async () => {
  const db = await getTempDB();
  const count = WRITE_BATCH_SIZE * 2 + 7;

  const writes = Array.from({ length: count }, (_, index) => ({
    info: sampleInfo(`id-${index}`),
    createdAt: 1759000000 + index,
  }));

  expect(insertInfoBatch(writes, db)).toBe(count);
  expect(db.highestRowId.getRequired().rowid).toBe(count);
  expect(db.searchIDCode.get(`id-${count - 1}`)?.createdAt).toBe(
    1759000000 + count - 1,
  );
});

/**
 * A row's worth of computed properties, keyed by whatever idCode the test
 * needs. The values are not the point here; the transaction boundaries are.
 * @param idCode - the primary key the row takes
 * @returns the properties to store
 */
function sampleInfo(idCode: string): MoleculeInfo {
  return {
    mf: 'C3H8',
    mw: 44.095733722651964,
    em: 44.06260025784,
    charge: 0,
    idCode,
    noStereoID: idCode,
    noStereoTautomerID: idCode,
    failedTautomerID: 0,
    ssIndex: [1082130432, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    logS: -1.2539999783039093,
    logP: 1.4315999746322632,
    acceptorCount: 0,
    donorCount: 0,
    stereoCenterCount: 0,
    rotatableBondCount: 0,
    polarSurfaceArea: 0,
    nbFragments: 1,
    unsaturation: 0,
    atoms: { C: 3, H: 8 },
  };
}
