/**
 * Row shapes read straight out of the database, kept in one file so the rest
 * of the code imports a type rather than restating a table.
 */

/** The single row of the `stats` table, holding one refresh of the rollup. */
export interface StatsRow {
  id: number;
  /** When the rollup was computed, in unix seconds. */
  computedAt: number;
  /** How long the pass took, in milliseconds. */
  durationMs: number;
  /** How many molecules the pass read. */
  scanned: number;
  /** The rollup itself, as JSON — see {@link CacheStats}. */
  payload: string;
}

/** The columns the statistics pass reads for each molecule. */
export interface StatsScanRow {
  rowid: number;
  mw: number | null;
  logP: number | null;
  logS: number | null;
  polarSurfaceArea: number | null;
  charge: number | null;
  nbFragments: number | null;
  stereoCenterCount: number | null;
  rotatableBondCount: number | null;
  donorCount: number | null;
  acceptorCount: number | null;
  unsaturation: number | null;
  failedTautomerID: number | null;
  mf: string | null;
  atoms: Uint8Array | null;
  createdAt: number | null;
}
