import type { DB } from '../db/DB.ts';
import type { StatsScanRow } from '../db/rows.ts';

import { Accumulators } from './accumulators.ts';
import type { CacheStats, FormulaCount, MonthCount } from './types.ts';

/**
 * How many molecules one pass of the scan reads before yielding. Small enough
 * that the write lock and the event loop are both released often.
 */
const CHUNK = 25_000;

/** How many formulas the rollup keeps. */
const TOP_FORMULAS = 25;

/**
 * Read every molecule and reduce the cache to the figures the statistics page
 * shows.
 *
 * The scan is chunked by rowid and yields between chunks, so it never holds
 * the database for long — it is meant to run in its own process, beside the
 * server rather than inside it.
 * @param db - the database to read
 * @param onProgress - called with the number of molecules read so far
 * @returns the figures, and how many molecules were read
 */
export async function computeStats(
  db: DB,
  onProgress?: (scanned: number) => void,
): Promise<{ stats: CacheStats; scanned: number }> {
  const highest = db.highestRowId.get()?.rowid ?? 0;
  const accumulators = new Accumulators();

  const chunk = db.statement<StatsScanRow>(
    `SELECT rowid, mw, logP, logS, polarSurfaceArea, charge, nbFragments,
       stereoCenterCount, rotatableBondCount, donorCount, acceptorCount,
       unsaturation, failedTautomerID, atoms, createdAt
     FROM molecules WHERE rowid > ? AND rowid <= ? ORDER BY rowid`,
  );

  let scanned = 0;
  for (let start = 0; start < highest; start += CHUNK) {
    const rows = chunk.all(start, start + CHUNK);
    for (const row of rows) {
      accumulators.add(row);
    }
    scanned += rows.length;
    onProgress?.(scanned);

    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }

  return {
    stats: {
      ...accumulators.toStats(),
      ...readAggregates(db),
      perMonth: readPerMonth(db),
      topFormulas: readTopFormulas(db),
    },
    scanned,
  };
}

/**
 * The figures SQLite answers faster than a scan in JavaScript would: the two
 * distinct counts, which would otherwise mean holding millions of strings in
 * memory.
 * @param db - the database to read
 * @returns the distinct structure counts
 */
function readAggregates(
  db: DB,
): Pick<CacheStats, 'distinctNoStereoID' | 'distinctNoStereoTautomerID'> {
  const row = db
    .statement<{ noStereo: number; noStereoTautomer: number }>(
      `SELECT COUNT(DISTINCT noStereoID) AS noStereo,
              COUNT(DISTINCT noStereoTautomerID) AS noStereoTautomer
       FROM molecules`,
    )
    .get();
  return {
    distinctNoStereoID: row?.noStereo ?? 0,
    distinctNoStereoTautomerID: row?.noStereoTautomer ?? 0,
  };
}

/**
 * How many molecules arrived each month.
 *
 * Rows with no date are left out rather than gathered into a month they may
 * not belong to; `undated` counts them.
 * @param db - the database to read
 * @returns one entry per month, oldest first
 */
function readPerMonth(db: DB): MonthCount[] {
  const counted = db
    .statement<{ month: string; count: number }>(
      `SELECT strftime('%Y-%m', createdAt, 'unixepoch') AS month,
              COUNT(*) AS count
       FROM molecules WHERE createdAt IS NOT NULL
       GROUP BY month ORDER BY month`,
    )
    .all();
  return fillMonthGaps(counted);
}

/**
 * Put back the months nothing arrived in.
 *
 * `GROUP BY` returns only the months that have rows, and a chart drawn from
 * those alone stands a quiet month next to a busy one as though no time passed
 * between them. A month with no molecules is a measurement, so it is written
 * with a count of zero.
 * @param counted - the months that have molecules, oldest first
 * @returns every month from the first to the last, none missing
 */
export function fillMonthGaps(counted: readonly MonthCount[]): MonthCount[] {
  const first = counted[0];
  const last = counted.at(-1);
  if (first === undefined || last === undefined) return [];

  const known = new Map(counted.map((entry) => [entry.month, entry.count]));
  const filled: MonthCount[] = [];
  for (let month = first.month; ; month = nextMonth(month)) {
    filled.push({ month, count: known.get(month) ?? 0 });
    if (month === last.month) break;
  }
  return filled;
}

/**
 * The month after this one.
 * @param month - a month written `YYYY-MM`
 * @returns the next month, in the same form
 */
function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  return index === 12
    ? `${year + 1}-01`
    : `${year}-${String(index + 1).padStart(2, '0')}`;
}

/**
 * The formulas the most molecules share.
 * @param db - the database to read
 * @returns the commonest formulas, most frequent first
 */
function readTopFormulas(db: DB): FormulaCount[] {
  return db
    .statement<FormulaCount>(
      `SELECT mf, COUNT(*) AS count FROM molecules
       WHERE mf IS NOT NULL GROUP BY mf ORDER BY count DESC, mf LIMIT ?`,
    )
    .all(TOP_FORMULAS);
}
