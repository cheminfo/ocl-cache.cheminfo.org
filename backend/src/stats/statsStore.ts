import type { DB } from '../db/DB.ts';

import { computeWholeTableFigures, scanRange } from './computeStats.ts';
import { mergeAdditive } from './mergeStats.ts';
import { fillMonthGaps } from './months.ts';
import type { CacheStats, StatsSnapshot, StoredRollup } from './types.ts';

/**
 * How long the three whole-table figures may stand before a pass recomputes
 * them. They cost a walk of the table, so they are refreshed daily rather than
 * on every pass.
 */
const FULL_PASS_INTERVAL_S = Number(
  process.env.STATS_FULL_INTERVAL ?? 24 * 60 * 60,
);

/**
 * Read the last rollup.
 * @param db - the database to read
 * @returns the rollup, or null when no pass has run yet
 */
export function readStats(db: DB): StatsSnapshot | null {
  const stored = readStored(db);
  if (stored === null) return null;
  const row = db.readStats.getRequired();

  return {
    computedAt: row.computedAt,
    durationMs: row.durationMs,
    scanned: row.scanned,
    full: stored.fullComputedAt === row.computedAt,
    stats: stored.stats,
  };
}

/**
 * Bring the figures up to date.
 *
 * The table is only ever appended to, so a pass normally reads just the
 * molecules that have arrived since the last one and adds them to what was
 * already counted. Only the distinct counts and the formula ranking need the
 * whole table, and they are refreshed on their own slower cadence.
 * @param db - the database to read and write
 * @param options - what to force, and what to report progress to
 * @param options.full - recompute from the first row, ignoring what is stored
 * @param options.onProgress - called with the number of molecules read so far
 * @returns the rollup that was stored
 */
export async function refreshStats(
  db: DB,
  options: { full?: boolean; onProgress?: (scanned: number) => void } = {},
): Promise<StatsSnapshot> {
  const started = performance.now();
  const previous = options.full ? null : readStored(db);
  const now = Math.floor(Date.now() / 1000);

  // The whole-table figures are recomputed when nothing is stored, when the
  // caller asks, or when the ones on record have gone stale.
  const needsFull =
    previous === null || now - previous.fullComputedAt >= FULL_PASS_INTERVAL_S;

  const scan = await scanRange(db, {
    fromRowId: previous?.scannedUpTo ?? 0,
    onProgress: options.onProgress,
  });

  const additive =
    previous === null
      ? scan.stats
      : mergeAdditive(stripWholeTable(previous.stats), scan.stats);

  const wholeTable = needsFull
    ? computeWholeTableFigures(db)
    : {
        distinctNoStereoID: previous.stats.distinctNoStereoID,
        distinctNoStereoTautomerID: previous.stats.distinctNoStereoTautomerID,
        topFormulas: previous.stats.topFormulas,
      };

  const stats: CacheStats = {
    ...additive,
    ...wholeTable,
    perMonth: fillMonthGaps(additive.perMonth),
  };

  const durationMs = Math.round(performance.now() - started);
  const rollup: StoredRollup = {
    stats,
    scannedUpTo: scan.upTo,
    fullComputedAt: needsFull ? now : previous.fullComputedAt,
  };

  db.writeStats.run({
    computedAt: now,
    durationMs,
    scanned: scan.scanned,
    payload: JSON.stringify(rollup),
  });

  return {
    computedAt: now,
    durationMs,
    scanned: scan.scanned,
    full: needsFull,
    stats,
  };
}

/**
 * The number of molecules the cache holds right now.
 *
 * Read from the last rowid rather than counted: no row is ever deleted, so the
 * rowids run `1..n` and SQLite answers this by seeking one end of the b-tree.
 * @param db - the database to read
 * @returns how many molecules are cached
 */
export function liveTotal(db: DB): number {
  return db.highestRowId.get()?.rowid ?? 0;
}

/**
 * The stored rollup, or null when there is none to continue from.
 * @param db - the database to read
 * @returns the rollup as it was written
 */
function readStored(db: DB): StoredRollup | null {
  const row = db.readStats.get();
  if (row === undefined) return null;
  try {
    const stored = JSON.parse(row.payload) as StoredRollup;
    // A payload written before the rollup carried its position cannot be
    // continued from; the next pass reads everything instead.
    return typeof stored.scannedUpTo === 'number' ? stored : null;
  } catch {
    return null;
  }
}

/**
 * The stored figures, less the three a pass cannot add to.
 * @param stats - the figures on record
 * @returns the additive half of them
 */
function stripWholeTable(stats: CacheStats) {
  const {
    distinctNoStereoID: _distinct,
    distinctNoStereoTautomerID: _distinctTautomer,
    topFormulas: _formulas,
    ...additive
  } = stats;
  return additive;
}
