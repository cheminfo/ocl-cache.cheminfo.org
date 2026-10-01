import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, expect, test } from 'vitest';

import type { MoleculeInfo } from '../../MoleculeInfo.ts';
import { DB } from '../DB.ts';
import { applyConnectionPragmas } from '../connection.ts';
import { prepareDB } from '../dbFactory.ts';
import {
  _resetWriteQueue,
  enqueueInfo,
  startWriteQueue,
  stopWriteQueue,
  writeQueueStats,
} from '../writeQueue.ts';

const directories: string[] = [];

afterEach(async () => {
  await stopWriteQueue();
  _resetWriteQueue();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a row handed over with no writer running is the caller's to write", () => {
  expect(enqueueInfo(sampleInfo('nobody'), 1759000000)).toBe('disabled');
  expect(writeQueueStats().running).toBe(false);
});

test(
  'the writer thread commits what the request path hands it',
  { timeout: 30000 },
  async () => {
    const file = await migratedDatabase();

    startWriteQueue(file);
    expect(enqueueInfo(sampleInfo('queued-a'), 1759000001)).toBe('queued');
    expect(enqueueInfo(sampleInfo('queued-b'), 1759000002)).toBe('queued');
    expect(writeQueueStats().pending).toBe(2);

    // Nothing is on disk yet: the point is that the caller did not wait.
    expect(readIdCodes(file)).toStrictEqual([]);

    await stopWriteQueue();

    expect(readIdCodes(file)).toStrictEqual(['queued-a', 'queued-b']);
  },
);

test(
  'the same molecule handed over twice is written once',
  { timeout: 30000 },
  async () => {
    const file = await migratedDatabase();
    startWriteQueue(file);

    expect(enqueueInfo(sampleInfo('twice'), 1759000001)).toBe('queued');
    expect(enqueueInfo(sampleInfo('twice'), 1759000002)).toBe('queued');
    expect(writeQueueStats().pending).toBe(1);

    await stopWriteQueue();

    expect(readIdCodes(file)).toStrictEqual(['twice']);
    expect(readCreatedAt(file, 'twice')).toBe(1759000001);
  },
);

/**
 * A database file with the schema applied, as the server leaves it before the
 * writer thread opens its own connection.
 * @returns the path of the file
 */
async function migratedDatabase(): Promise<string> {
  const directory = mkdtempSync(join(tmpdir(), 'ocl-cache-writer-'));
  directories.push(directory);
  const file = join(directory, 'db.sqlite');

  const connection = new DatabaseSync(file);
  applyConnectionPragmas(connection);
  await prepareDB(connection);
  connection.close();

  return file;
}

/**
 * Every idCode the file holds, in insertion order.
 * @param file - the database path
 * @returns the idCodes
 */
function readIdCodes(file: string): string[] {
  const connection = new DatabaseSync(file);
  try {
    const db = new DB(connection);
    return db.selectAllIDCode.all().map(({ idCode }) => idCode);
  } finally {
    connection.close();
  }
}

/**
 * The date recorded against one row.
 * @param file - the database path
 * @param idCode - the row to read
 * @returns the insertion time in unix seconds
 */
function readCreatedAt(file: string, idCode: string): number | null {
  const connection = new DatabaseSync(file);
  try {
    return new DB(connection).searchIDCode.getRequired(idCode).createdAt;
  } finally {
    connection.close();
  }
}

/**
 * A row's worth of computed properties under a chosen idCode.
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
