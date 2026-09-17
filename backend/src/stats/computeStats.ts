import type { DB } from '../db/DB.ts';
import type { StatsScanRow } from '../db/rows.ts';

import { Accumulators } from './accumulators.ts';
import type { AdditiveStats, FormulaCount } from './types.ts';

/**
 * How many molecules one pass of the scan reads before yielding. Small enough
 * that the write lock and the event loop are both released often.
 */
const CHUNK = 25_000;

/** How many formulas the rollup keeps. */
const TOP_FORMULAS = 25;

/** What one scan of a range of rows produced. */
export interface ScanResult {
  /** Everything that range adds to the figures. */
  stats: AdditiveStats;
  /** How many molecules were read. */
  scanned: number;
  /** The highest rowid the scan covered. */
  upTo: number;
}

/**
 * Read a range of molecules and reduce it to the figures that add up.
 *
 * The scan is chunked by rowid and yields between chunks, so it never holds
 * the database for long — it is meant to run in its own process, beside the
 * server rather than inside it.
 *
 * `fromRowId` is what makes a refresh cheap: the table is only ever appended
 * to, so everything at or below a rowid already counted is counted for good,
 * and a pass reads only what has arrived since.
 * @param db - the database to read
 * @param options - where to start, and what to report progress to
 * @param options.fromRowId - the highest rowid already counted; the scan
 * starts above it
 * @param options.onProgress - called with the number of molecules read so far
 * @returns the figures for that range, and how far it got
 */
export async function scanRange(
  db: DB,
  options: { fromRowId?: number; onProgress?: (scanned: number) => void } = {},
): Promise<ScanResult> {
  const { fromRowId = 0, onProgress } = options;
  const highest = db.highestRowId.get()?.rowid ?? 0;
  const accumulators = new Accumulators();

  const chunk = db.statement<StatsScanRow>(
    `SELECT rowid, mw, logP, logS, polarSurfaceArea, charge, nbFragments,
       stereoCenterCount, rotatableBondCount, donorCount, acceptorCount,
       unsaturation, failedTautomerID, atoms, createdAt
     FROM molecules WHERE rowid > ? AND rowid <= ? ORDER BY rowid`,
  );

  let scanned = 0;
  for (let start = fromRowId; start < highest; start += CHUNK) {
    const rows = chunk.all(start, Math.min(start + CHUNK, highest));
    for (const row of rows) {
      accumulators.add(row);
    }
    scanned += rows.length;
    onProgress?.(scanned);

    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }

  return { stats: accumulators.toStats(), scanned, upTo: highest };
}

/**
 * The three figures no pass can add to another: a distinct count and a ranking
 * both have to see every row.
 *
 * They cost a full walk of the table, so they are refreshed on their own
 * cadence rather than on every pass.
 * @param db - the database to read
 * @returns the distinct structure counts and the commonest formulas
 */
export function computeWholeTableFigures(db: DB): {
  distinctNoStereoID: number;
  distinctNoStereoTautomerID: number;
  topFormulas: FormulaCount[];
} {
  const distinct = db
    .statement<{ noStereo: number; noStereoTautomer: number }>(
      `SELECT COUNT(DISTINCT noStereoID) AS noStereo,
              COUNT(DISTINCT noStereoTautomerID) AS noStereoTautomer
       FROM molecules`,
    )
    .get();

  const topFormulas = db
    .statement<FormulaCount>(
      `SELECT mf, COUNT(*) AS count FROM molecules
       WHERE mf IS NOT NULL GROUP BY mf ORDER BY count DESC, mf LIMIT ?`,
    )
    .all(TOP_FORMULAS);

  return {
    distinctNoStereoID: distinct?.noStereo ?? 0,
    distinctNoStereoTautomerID: distinct?.noStereoTautomer ?? 0,
    topFormulas,
  };
}
