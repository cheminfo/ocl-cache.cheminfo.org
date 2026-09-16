import { existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import pino from 'pino';
import Postgrator from 'postgrator';

import { DB } from './DB.ts';

const logger = pino({ messageKey: 'dbFactory' });

const WAL_CHECKPOINT_THRESHOLD = 100_000_000;
const WAL_CHECK_INTERVAL = 300_000;

let instance: Promise<DB> | undefined;

/**
 * Returns the singleton on-disk database, creating it on first call.
 * @returns the database
 */
export function getDB(): Promise<DB> {
  // The promise itself is cached, so two concurrent callers cannot each open
  // a connection and run the migrations.
  instance ??= openDB();
  return instance;
}

async function openDB(): Promise<DB> {
  const file = getDatabasePath();
  mkdirSync(dirname(file), { recursive: true });
  migrateLegacyLocation(file);

  const db = new DatabaseSync(file);
  _applyPragmas(db);
  await prepareDB(db);

  watchWalSize(db, file);
  return new DB(db, join(dirname(file), 'slow-queries.log'));
}

/**
 * Returns a fresh in-memory database with the migrations applied, for tests.
 * @returns the temporary database
 */
export async function getTempDB(): Promise<DB> {
  const db = new DatabaseSync(':memory:');
  await prepareDB(db);
  return new DB(db);
}

/**
 * Replace the singleton, for tests.
 * @param db - the instance to use, or undefined to reset
 */
export const _setInstance = (db: DB | undefined): void => {
  instance = db === undefined ? undefined : Promise.resolve(db);
};

/**
 * The path of the on-disk database file.
 * @returns the absolute path
 */
export function getDatabasePath(): string {
  const dataDir =
    process.env.DATA_DIR ?? join(import.meta.dirname, '../../data');
  return join(dataDir, 'sqlite', 'db.sqlite');
}

/**
 * Ensure the schema of the database is up to date.
 * @param db - the connection to migrate
 */
export async function prepareDB(db: DatabaseSync): Promise<void> {
  const postgrator = new Postgrator({
    migrationPattern: join(import.meta.dirname, 'migrations/*'),
    driver: 'sqlite3',
    execQuery: (query) => Promise.resolve({ rows: db.prepare(query).all() }),
    execSqlScript: (sqlScript) => {
      db.exec(sqlScript);
      return Promise.resolve();
    },
  });
  await postgrator.migrate();
}

/**
 * Apply the pragmas every on-disk connection needs. Never called for an
 * in-memory database, where WAL is silently ignored.
 * @param db - the connection to configure
 */
const _applyPragmas = (db: DatabaseSync): void => {
  db.exec('PRAGMA busy_timeout = 30000');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = OFF');
  // node:sqlite defaults to a 2 MB page cache, far too small for this workload.
  db.exec('PRAGMA cache_size = -131072');
  db.exec('PRAGMA temp_store = MEMORY');
};

/**
 * Move a database left at the pre-`data/` location by an earlier release.
 * @param file - the current database path
 */
function migrateLegacyLocation(file: string): void {
  const legacy = join(import.meta.dirname, '../../sqlite/db.sqlite');
  if (legacy !== file && existsSync(legacy) && !existsSync(file)) {
    logger.info(`Moving database from ${legacy} to ${file}`);
    renameSync(legacy, file);
  }
}

/**
 * Checkpoint the write-ahead log once it grows past the threshold.
 * @param db - the connection to checkpoint
 * @param file - the database path, used to find the WAL file
 */
function watchWalSize(db: DatabaseSync, file: string): void {
  setInterval(() => {
    try {
      if (statSync(`${file}-wal`).size > WAL_CHECKPOINT_THRESHOLD) {
        db.exec('PRAGMA wal_checkpoint(RESTART)');
        logger.info('Restarted wal file');
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error(error);
      }
    }
  }, WAL_CHECK_INTERVAL).unref();
}
