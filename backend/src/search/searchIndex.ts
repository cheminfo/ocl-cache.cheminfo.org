import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import * as OCL from 'openchemlib';
import { MoleculesDBSQLite } from 'openchemlib-sqlite';
import pino from 'pino';

import { MAX_TAUTOMERS } from '../calculate/structureKeys.ts';
import { applyConnectionPragmas, watchWalSize } from '../db/connection.ts';
import { getDatabasePath } from '../db/dbFactory.ts';

const logger = pino({ messageKey: 'searchIndex' });

/** The alias the molecules database is attached under. */
const MOLECULES_SCHEMA = 'mol';

/** The index and the connection it was opened on. */
export interface SearchIndex {
  /** The index itself. */
  molDB: MoleculesDBSQLite;
  /**
   * The connection it holds, with the cache attached. The library takes a
   * connection it does not own and exposes none, so the caller that opened it
   * keeps it — a bulk index pass needs it to wrap a chunk in one transaction.
   */
  db: DatabaseSync;
}

let instance: SearchIndex | undefined;

/**
 * Where the search index lives: a database of its own, beside the cache.
 *
 * Its own file, not a table in `molecules`, because that is what keeps the
 * 150-million-row cache out of this entirely. Nothing here writes to it: the
 * index is attached to it read-only in effect, so it can be deleted and rebuilt
 * — or built on another machine and copied in — without the cache noticing. The
 * cache's own schema never changes, so there is no migration over 150 million
 * rows and no window during which the API cannot answer.
 * @returns the index database path
 */
export function getSearchIndexPath(): string {
  return join(dirname(getDatabasePath()), 'search.sqlite');
}

/**
 * The search index, opened on first use.
 *
 * `entriesTable` is qualified, which is what makes a separate file work:
 * `openchemlib-sqlite` then omits the foreign key SQLite has no syntax for
 * across databases, and creates its own tables here instead of in the cache.
 * @returns the index and its connection
 */
export function getSearchIndex(): SearchIndex {
  if (instance !== undefined) return instance;

  const file = getSearchIndexPath();
  const db = new DatabaseSync(file);
  applyConnectionPragmas(db);
  // Read index pages out of the page cache rather than copying them in. The
  // prescreen reads the fingerprint index end to end, so it is paging work more
  // than it is processor work.
  db.exec('PRAGMA mmap_size = 2147483648');
  db.exec(`ATTACH DATABASE '${getDatabasePath()}' AS ${MOLECULES_SCHEMA}`);

  const molDB = new MoleculesDBSQLite(db, OCL, {
    entriesTable: `${MOLECULES_SCHEMA}.molecules`,
    // The cache has no integer key of its own — `idCode` is its primary key —
    // so the rowid stands in. It is stable because no row is ever deleted and
    // the file is never VACUUMed; both are properties of this cache, not of
    // SQLite, so neither may change without rebuilding this index.
    pkColumn: 'rowid',
    idCodeColumn: 'idCode',
    mwColumn: 'mw',
    // The cache's `mw` really is the molecular weight, so the prescreen may seek
    // past every entry too light to be a superstructure of the query.
    trustMwColumn: true,
    maxTautomers: MAX_TAUTOMERS,
  });
  molDB.migrate({
    onMigration: (event) => {
      if (event.phase !== 'progress') {
        logger.info(
          `index schema ${event.version}: ${event.description} (${event.phase})`,
        );
      }
    },
  });
  watchWalSize(db, file);
  instance = { molDB, db };
  return instance;
}

/** Close the index, for tests and for shutdown. */
export function closeSearchIndex(): void {
  instance?.db.close();
  instance = undefined;
}

/** Replace the index, for tests. */
export const _setSearchIndex = (index: SearchIndex | undefined): void => {
  instance = index;
};
