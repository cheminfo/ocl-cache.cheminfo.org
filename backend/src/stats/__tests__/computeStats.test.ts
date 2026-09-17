import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import calculateMoleculeInfo from '../../calculate/calculateMoleculeInfo.ts';
import { getTempDB } from '../../db/dbFactory.ts';
import { insertInfo } from '../../db/insertInfo.ts';
import { fillMonthGaps } from '../computeStats.ts';
import { liveTotal, readStats, refreshStats } from '../statsStore.ts';

/** Four molecules with deliberately different shapes. */
const MOLECULES = [
  'CCO',
  'CC(=O)Oc1ccccc1C(=O)O',
  'c1ccccc1',
  'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
];

/**
 * Fill a temporary cache with the four molecules.
 *
 * The properties are computed in this process rather than through the worker
 * pool the routes use: the pool spawns one thread per core per test file, and
 * what these tests are about is the rollup, not how the work is scheduled.
 * @returns the seeded database
 */
async function seed() {
  const db = await getTempDB();
  for (const smiles of MOLECULES) {
    insertInfo(calculateMoleculeInfo(Molecule.fromSmiles(smiles)), db);
  }
  return db;
}

test(
  'no pass has run, so there is no rollup to read',
  { timeout: 30000 },
  async () => {
    const db = await getTempDB();

    expect(readStats(db)).toBeNull();
  },
);

test(
  'the live total is the number of molecules cached',
  { timeout: 30000 },
  async () => {
    const db = await seed();

    expect(liveTotal(db)).toBe(4);
  },
);

test(
  'a pass counts every molecule and every element',
  { timeout: 30000 },
  async () => {
    const db = await seed();

    const snapshot = await refreshStats(db);

    expect(snapshot.scanned).toBe(4);
    expect(snapshot.stats.total).toBe(4);
    // Every one of the four contains carbon and hydrogen; only two contain
    // nitrogen, and three contain oxygen.
    const elements = new Map(
      snapshot.stats.elements.map((entry) => [entry.symbol, entry.molecules]),
    );
    expect(elements.get('C')).toBe(4);
    expect(elements.get('O')).toBe(3);
    expect(elements.get('N')).toBe(1);
  },
);

test(
  'every molecule inserted now carries its month',
  { timeout: 30000 },
  async () => {
    const db = await seed();

    const { stats } = await refreshStats(db);

    expect(stats.dated).toBe(4);
    expect(stats.undated).toBe(0);
    expect(stats.perMonth).toHaveLength(1);
    const month = new Date().toISOString().slice(0, 7);
    expect(stats.perMonth[0]).toStrictEqual({ month, count: 4 });
  },
);

test(
  'a molecule with no date is counted apart rather than given one',
  { timeout: 30000 },
  async () => {
    const db = await seed();
    db.statement('UPDATE molecules SET createdAt = NULL WHERE rowid = 1').run();

    const { stats } = await refreshStats(db);

    expect(stats.total).toBe(4);
    expect(stats.dated).toBe(3);
    expect(stats.undated).toBe(1);
    expect(stats.perMonth[0]?.count).toBe(3);
  },
);

test(
  'the rollup is read back exactly as it was written',
  { timeout: 30000 },
  async () => {
    const db = await seed();
    const written = await refreshStats(db);

    const read = readStats(db);

    expect(read?.scanned).toBe(written.scanned);
    expect(read?.stats).toStrictEqual(written.stats);
  },
);

test(
  'a second pass replaces the first rather than adding a row',
  { timeout: 30000 },
  async () => {
    const db = await seed();
    await refreshStats(db);
    await refreshStats(db);

    const rows = db.statement('SELECT id FROM stats').all();

    expect(rows).toHaveLength(1);
  },
);

test(
  'the four molecules are four distinct structures',
  { timeout: 30000 },
  async () => {
    const db = await seed();

    const { stats } = await refreshStats(db);

    expect(stats.distinctNoStereoID).toBe(4);
    expect(stats.topFormulas[0]?.count).toBe(1);
    expect(stats.mass.counted).toBe(4);
    expect(stats.mass.min).toBeLessThan(stats.mass.max ?? 0);
  },
);

test('a month nothing arrived in is written with a count of zero', () => {
  expect(
    fillMonthGaps([
      { month: '2026-02', count: 1 },
      { month: '2026-05', count: 3 },
    ]),
  ).toStrictEqual([
    { month: '2026-02', count: 1 },
    { month: '2026-03', count: 0 },
    { month: '2026-04', count: 0 },
    { month: '2026-05', count: 3 },
  ]);
});

test('a gap across a new year counts through December', () => {
  expect(
    fillMonthGaps([
      { month: '2025-11', count: 2 },
      { month: '2026-02', count: 1 },
    ]).map((entry) => entry.month),
  ).toStrictEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
});

test('a single month, and no month at all, need no filling', () => {
  expect(fillMonthGaps([{ month: '2026-09', count: 4 }])).toStrictEqual([
    { month: '2026-09', count: 4 },
  ]);
  expect(fillMonthGaps([])).toStrictEqual([]);
});
