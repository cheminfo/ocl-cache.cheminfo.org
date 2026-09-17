import type { DB } from '../db/DB.ts';

import { computeStats } from './computeStats.ts';
import type { CacheStats, StatsSnapshot } from './types.ts';

/**
 * Read the last rollup.
 * @param db - the database to read
 * @returns the rollup, or null when no pass has run yet
 */
export function readStats(db: DB): StatsSnapshot | null {
  const row = db.readStats.get();
  if (row === undefined) return null;

  let stats: CacheStats;
  try {
    stats = JSON.parse(row.payload) as CacheStats;
  } catch {
    // A payload that cannot be parsed is treated as no rollup at all, so the
    // page says the figures are not ready rather than failing the request.
    return null;
  }

  return {
    computedAt: row.computedAt,
    durationMs: row.durationMs,
    scanned: row.scanned,
    stats,
  };
}

/**
 * Run a full pass and store the result.
 * @param db - the database to read and write
 * @param onProgress - called with the number of molecules read so far
 * @returns the rollup that was stored
 */
export async function refreshStats(
  db: DB,
  onProgress?: (scanned: number) => void,
): Promise<StatsSnapshot> {
  const start = performance.now();
  const { stats, scanned } = await computeStats(db, onProgress);
  const durationMs = Math.round(performance.now() - start);
  const computedAt = Math.floor(Date.now() / 1000);

  db.writeStats.run({
    computedAt,
    durationMs,
    scanned,
    payload: JSON.stringify(stats),
  });

  return { computedAt, durationMs, scanned, stats };
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
