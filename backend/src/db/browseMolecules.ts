import type { DB } from './DB.ts';

/** One molecule in a browse result. */
export interface BrowseRow {
  /** Its idCode. */
  idCode: string;
  /** Its molecular formula. */
  mf: string;
  /** Its molecular weight. */
  mw: number;
}

/** A page of molecules, and where the next one starts. */
export interface BrowsePage {
  /** The molecules, in rowid order. */
  rows: BrowseRow[];
  /** The cursor the next page starts after, or null at the end. */
  next: number | null;
}

/**
 * Read a page of molecules, filtered and in insertion order.
 *
 * The cursor is a rowid, not an offset. `LIMIT 24 OFFSET 2000000` makes SQLite
 * walk two million rows to throw them away, so paging deep into a
 * 150-million-row table gets slower the further it goes; `rowid > ?` seeks
 * straight to the page. Rows are only ever appended and a rowid is never
 * reused, so the order is stable and a cursor stays valid.
 * @param db - the cache to read
 * @param where - the filter clause, or `'1'`
 * @param params - its named parameters
 * @param limit - how many molecules the page holds
 * @param after - the rowid the page starts after
 * @returns the page and the next cursor
 */
export function browseMolecules(
  db: DB,
  where: string,
  params: Record<string, number | string>,
  limit: number,
  after: number,
): BrowsePage {
  // One more than asked for, so "is there a next page?" is answered by the
  // read itself rather than by counting what matches — which is a scan of the
  // whole table.
  const rows = db
    .statement<{ rowid: number; idCode: unknown; mf: string; mw: number }>(
      `SELECT rowid, idCode, mf, mw FROM molecules
       WHERE rowid > :after AND ${where}
       ORDER BY rowid LIMIT :limit`,
    )
    .all({ ...params, after, limit: limit + 1 });

  const page = rows.slice(0, limit);
  return {
    rows: page.map((row) => ({
      // The column takes NUMERIC affinity, so an all-digit idCode comes back
      // as a number.
      idCode: String(row.idCode),
      mf: row.mf,
      mw: row.mw,
    })),
    next: rows.length > limit ? (page.at(-1)?.rowid ?? null) : null,
  };
}
