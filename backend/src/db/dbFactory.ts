import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';

import pino from 'pino';
import Postgrator from 'postgrator';

import { DB } from './DB.ts';
import {
  BUSY_TIMEOUT,
  applyConnectionPragmas,
  slowQueryLogPath,
  watchWalSize,
} from './connection.ts';

const logger = pino({ messageKey: 'dbFactory' });

// Three containers share the file and migrate at startup, so a process may
// have to wait for a whole migration: building an index over two million rows
// is minutes, and the usual 30 s would turn that wait into a crash loop.
const MIGRATION_BUSY_TIMEOUT = 600_000;

const WAL_RETRY_DELAY = 200;
const WAL_RETRY_ATTEMPTS = 50;

/** SQLITE_BUSY. */
const SQLITE_BUSY = 5;

let instance: Promise<DB> | undefined;
let walWatcher: NodeJS.Timeout | undefined;

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
  await applyPragmas(db);
  db.exec(`PRAGMA busy_timeout = ${MIGRATION_BUSY_TIMEOUT}`);
  await prepareDB(db);
  db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT}`);

  walWatcher = watchWalSize(db, file);
  return new DB(db, slowQueryLogPath(file));
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
 * Where the database and the import queues live.
 * @returns the data directory
 */
export function getDataDir(): string {
  return process.env.DATA_DIR ?? join(import.meta.dirname, '../../../data');
}

/**
 * The path of the on-disk database file.
 * @returns the absolute path
 */
export function getDatabasePath(): string {
  return join(getDataDir(), 'sqlite', 'db.sqlite');
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
  // The schema moves under the write lock, because the server, the SDF
  // importer and the statistics pass all open this file and migrate at once:
  // a process that loses the race then reads the winner's version and has
  // nothing left to do. The transaction also makes one migration script
  // all-or-nothing, which `db.exec` on its own is not — a script whose second
  // statement fails would otherwise leave the first applied and the version
  // unrecorded, and every later start would replay it.
  db.exec('BEGIN IMMEDIATE');
  try {
    await postgrator.migrate();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Apply the pragmas, waiting out the exclusive lock the first connection takes
 * to convert the file to WAL. That conversion answers SQLITE_BUSY at once
 * instead of waiting on `busy_timeout`, so on a first start the containers
 * that lose the race must retry rather than die.
 * @param db - the connection to configure
 */
async function applyPragmas(db: DatabaseSync): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      applyConnectionPragmas(db);
      return;
    } catch (error) {
      if (
        (error as { errcode?: number }).errcode !== SQLITE_BUSY ||
        attempt === WAL_RETRY_ATTEMPTS
      ) {
        throw error;
      }

      await delay(WAL_RETRY_DELAY);
    }
  }
}

/**
 * Move a database left at the pre-`data/` location by an earlier release.
 * @param file - the current database path
 */
function migrateLegacyLocation(file: string): void {
  const legacy = join(import.meta.dirname, '../../../sqlite/db.sqlite');
  if (legacy !== file && existsSync(legacy) && !existsSync(file)) {
    logger.info(`Moving database from ${legacy} to ${file}`);
    renameSync(legacy, file);
  }
}

/**
 * Stop checkpointing from this thread.
 *
 * `wal_checkpoint(RESTART)` is a write, and `node:sqlite` runs it
 * synchronously: on the thread serving requests it stalls every one of them
 * for as long as it takes. A process that starts a writer thread hands the job
 * over to it.
 */
export function stopWalCheckpointing(): void {
  clearInterval(walWatcher);
  walWatcher = undefined;
}
