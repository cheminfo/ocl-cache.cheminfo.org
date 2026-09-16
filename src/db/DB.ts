import { appendFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';

import type { MoleculeRow } from '../MoleculeInfo.ts';

import { TypedStatementSync } from './TypedStatementSync.ts';

const SLOW_QUERY_THRESHOLD_MS = 10;

/**
 * The eight `ssIndexN` columns are deliberately absent: they hold arbitrary
 * 64-bit patterns and `node:sqlite` throws when a value exceeds
 * `Number.MAX_SAFE_INTEGER`. The `ssIndex` blob duplicates them, and they exist
 * only to back the composite index used by substructure pre-screening.
 */
const MOLECULE_COLUMNS = `idCode, mf, em, mw, charge, noStereoID, noStereoTautomerID,
  failedTautomerID, logS, logP, acceptorCount, donorCount, rotatableBondCount,
  stereoCenterCount, polarSurfaceArea, nbFragments, unsaturation, atoms, ssIndex`;

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

  constructor(db: DatabaseSync, slowQueryLog: string | null = null) {
    this.#db = db;
    this.#slowQueryLog = slowQueryLog;

    this.insertInfo = this.#prepare(
      `INSERT INTO molecules VALUES (@idCode, @mf, @em, @mw, @charge, @noStereoID,
        @noStereoTautomerID, @failedTautomerID, @logS, @logP, @acceptorCount,
        @donorCount, @rotatableBondCount, @stereoCenterCount, @polarSurfaceArea,
        @nbFragments, @unsaturation, @atoms, @ssIndex, @ssIndex0, @ssIndex1,
        @ssIndex2, @ssIndex3, @ssIndex4, @ssIndex5, @ssIndex6, @ssIndex7)`,
    );
    this.selectAllIDCode = this.#prepare('SELECT idCode FROM molecules');
    this.searchIDCode = this.#prepare(
      `SELECT ${MOLECULE_COLUMNS} FROM molecules WHERE idCode = ?`,
    );
    this.isIDCode = this.#prepare(
      'SELECT 1 AS present FROM molecules WHERE idCode = ? LIMIT 1',
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
