import type { DB } from '../db/DB.ts';

import type { SearchIndex } from './searchIndex.ts';

/** How many molecules one transaction indexes. */
const CHUNK = 5000;

/** What one indexing pass did. */
export interface IndexPassResult {
  /** Molecules added to the fingerprint index. */
  indexed: number;
  /** Whether more were waiting when the pass returned. */
  more: boolean;
  /** Wall-clock time of the pass, in ms. */
  elapsedMs: number;
}

/** How an indexing pass is bounded and reported. */
export interface IndexPassOptions {
  /** Stop after this many molecules. */
  limit?: number;
  /** Called after each committed chunk. */
  onProgress?: (result: IndexPassResult) => void;
  /** Stops the pass at the next chunk boundary. */
  signal?: AbortSignal;
}

/**
 * Add every molecule the index does not hold yet.
 *
 * The fingerprint is read out of the cache rather than computed: every row has
 * carried its `ssIndex` since the first release, and handing it over costs 88 µs
 * a molecule where rebuilding it costs 1350 — under four hours against
 * fifty-six at 150 million. That is the whole reason `insert()` takes a
 * precomputed entry.
 *
 * The frontier is the highest rowid the index holds, so a pass reads only what
 * arrived after it: molecules are only ever appended, and a rowid is never
 * reused. There is no watermark to store and nothing to reset.
 * @param db - the cache to read molecules from
 * @param index - the search index to fill, and its connection
 * @param options - the bound, progress reporting and abort signal
 * @returns what the pass indexed, and whether more is waiting
 */
export async function indexMolecules(
  db: DB,
  index: SearchIndex,
  options: IndexPassOptions = {},
): Promise<IndexPassResult> {
  const { limit = Number.MAX_SAFE_INTEGER, onProgress, signal } = options;
  const started = Date.now();
  const result: IndexPassResult = { indexed: 0, more: false, elapsedMs: 0 };

  const select = db.statement<{
    rowid: number;
    mw: number;
    ssIndex: Uint8Array;
  }>(
    `SELECT rowid, mw, ssIndex FROM molecules
     WHERE rowid > ? AND ssIndex IS NOT NULL ORDER BY rowid LIMIT ?`,
  );

  let frontier = highestIndexed(index);

  while (result.indexed < limit && !signal?.aborted) {
    const asked = Math.min(CHUNK, limit - result.indexed);
    const rows = select.all(frontier, asked);
    if (rows.length === 0) break;

    index.db.exec('BEGIN');
    try {
      for (const row of rows) {
        // The blob is the sixteen 32-bit words the fingerprint is, so the view
        // over it is the eight columns the index stores — no conversion, no
        // copy, and no molecule: with the fingerprint and the weight both given
        // `insert()` never reads the idCode, which is why '' is safe here.
        index.molDB.insert(row.rowid, '', {
          index: new Int32Array(row.ssIndex.buffer, row.ssIndex.byteOffset, 16),
          mw: row.mw,
        });
      }
      index.db.exec('COMMIT');
    } catch (error: unknown) {
      index.db.exec('ROLLBACK');
      throw error;
    }

    frontier = rows.at(-1)?.rowid ?? frontier;
    result.indexed += rows.length;
    result.more = rows.length === asked;
    result.elapsedMs = Date.now() - started;
    onProgress?.({ ...result });

    // Yield, so this stays responsive beside anything else in the process.
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }

  result.elapsedMs = Date.now() - started;
  return result;
}

/**
 * The highest rowid the index already holds.
 * @param index - the search index
 * @returns that rowid, or 0 when the index is empty
 */
export function highestIndexed(index: SearchIndex): number {
  const row = index.db
    .prepare('SELECT max(entry_id) AS entryId FROM ocl_ss_index')
    .get() as { entryId: number | null } | undefined;
  return row?.entryId ?? 0;
}
