import { appendFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';

import type { MoleculeRow } from '../MoleculeInfo.ts';

import { TypedStatementSync } from './TypedStatementSync.ts';
import type { StatsRow } from './rows.ts';

const SLOW_QUERY_THRESHOLD_MS = 10;

/**
 * The eight `ssIndexN` columns are deliberately absent: they hold arbitrary
 * 64-bit patterns and `node:sqlite` throws when a value exceeds
 * `Number.MAX_SAFE_INTEGER`. The `ssIndex` blob duplicates them, and they exist
 * only to back the composite index used by substructure pre-screening.
 */
const MOLECULE_COLUMNS = `idCode, mf, em, mw, charge, noStereoID, noStereoTautomerID,
  failedTautomerID, logS, logP, acceptorCount, donorCount, rotatableBondCount,
  stereoCenterCount, polarSurfaceArea, nbFragments, unsaturation, atoms, ssIndex,
  createdAt`;

/**
 * The columns an insert writes, named rather than positional. A positional
 * `INSERT INTO molecules VALUES (...)` binds itself to the column count, so a
 * migration that adds one fails every insert with "table molecules has N
 * columns but N-1 values were supplied".
 */
const INSERT_COLUMNS = `idCode, mf, em, mw, charge, noStereoID, noStereoTautomerID,
  failedTautomerID, logS, logP, acceptorCount, donorCount, rotatableBondCount,
  stereoCenterCount, polarSurfaceArea, nbFragments, unsaturation, atoms, ssIndex,
  ssIndex0, ssIndex1, ssIndex2, ssIndex3, ssIndex4, ssIndex5, ssIndex6, ssIndex7,
  createdAt`;

/**
 * Owns the connection, every prepared statement, and the slow-query log.
 * Call sites receive this instance and never the raw driver handle.
 */
export class DB {
  readonly #db: DatabaseSync;
  readonly #slowQueryLog: string | null;

  readonly insertInfo: TypedStatementSync<never>;
  readonly selectAllIDCode: TypedStatementSync<{ idCode: string }>;
  readonly searchIDCode: TypedStatementSync<MoleculeRow>;
  readonly isIDCode: TypedStatementSync<{ present: number }>;
  readonly highestRowId: TypedStatementSync<{ rowid: number | null }>;
  readonly readStats: TypedStatementSync<StatsRow>;
  readonly writeStats: TypedStatementSync<never>;

  constructor(db: DatabaseSync, slowQueryLog: string | null = null) {
    this.#db = db;
    this.#slowQueryLog = slowQueryLog;

    this.insertInfo = this.#prepare(
      `INSERT INTO molecules (${INSERT_COLUMNS}) VALUES (@idCode, @mf, @em, @mw,
        @charge, @noStereoID, @noStereoTautomerID, @failedTautomerID, @logS,
        @logP, @acceptorCount, @donorCount, @rotatableBondCount,
        @stereoCenterCount, @polarSurfaceArea, @nbFragments, @unsaturation,
        @atoms, @ssIndex, @ssIndex0, @ssIndex1, @ssIndex2, @ssIndex3, @ssIndex4,
        @ssIndex5, @ssIndex6, @ssIndex7, @createdAt)`,
    );
    this.selectAllIDCode = this.#prepare('SELECT idCode FROM molecules');
    this.searchIDCode = this.#prepare(
      `SELECT ${MOLECULE_COLUMNS} FROM molecules WHERE idCode = ?`,
    );
    this.isIDCode = this.#prepare(
      'SELECT 1 AS present FROM molecules WHERE idCode = ? LIMIT 1',
    );
    // No row is ever deleted, so rowids run 1..n and the last one is the
    // count. SQLite seeks the end of the rowid b-tree for this, where
    // `COUNT(*)` walks all of it — 0 ms against 444 ms at two million rows.
    this.highestRowId = this.#prepare(
      'SELECT max(rowid) AS rowid FROM molecules',
    );
    this.readStats = this.#prepare('SELECT * FROM stats WHERE id = 1');
    this.writeStats = this.#prepare(
      `INSERT INTO stats (id, computedAt, durationMs, scanned, payload)
       VALUES (1, @computedAt, @durationMs, @scanned, @payload)
       ON CONFLICT(id) DO UPDATE SET computedAt = @computedAt,
         durationMs = @durationMs, scanned = @scanned, payload = @payload`,
    );
  }

  /**
   * Prepare a statement built at run time, timed like the others.
   * @param sql - the statement source
   * @returns the typed statement
   */
  statement<T extends object>(sql: string): TypedStatementSync<T> {
    return this.#prepare(sql);
  }

  /**
   * Execute raw SQL, for migrations and pragmas.
   * @param sql - the script to run
   */
  exec(sql: string): void {
    this.#db.exec(sql);
  }

  /** Close the underlying connection. */
  close(): void {
    this.#db.close();
  }

  #prepare<T extends object>(sql: string): TypedStatementSync<T> {
    return new TypedStatementSync<T>(this.#db.prepare(sql), (tag, ms) => {
      this.#logSlow(tag, ms, sql);
    });
  }

  #logSlow(tag: string, ms: number, sql: string): void {
    if (this.#slowQueryLog && ms > SLOW_QUERY_THRESHOLD_MS) {
      const line = `${new Date().toISOString()} ${ms.toFixed(1)}ms ${tag} ${sql.replaceAll(/\s+/g, ' ')}\n`;
      appendFileSync(this.#slowQueryLog, line);
    }
  }
}
