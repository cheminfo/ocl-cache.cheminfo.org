import { statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import pino from 'pino';

const logger = pino({ messageKey: 'connection' });

const WAL_CHECKPOINT_THRESHOLD = 100_000_000;
const WAL_CHECK_INTERVAL = 300_000;

/** How long a statement waits for the write lock before giving up. */
export const BUSY_TIMEOUT = 30_000;

/**
 * Apply the pragmas every on-disk connection needs. Never called for an
 * in-memory database, where WAL is silently ignored.
 * @param db - the connection to configure
 */
export const applyConnectionPragmas = (db: DatabaseSync): void => {
  db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT}`);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = OFF');
  // node:sqlite defaults to a 2 MB page cache, far too small for this workload.
  db.exec('PRAGMA cache_size = -131072');
  db.exec('PRAGMA temp_store = MEMORY');
};

/**
 * Where slow queries are recorded, beside the database file.
 * @param file - the database path
 * @returns the log path
 */
export function slowQueryLogPath(file: string): string {
  return join(dirname(file), 'slow-queries.log');
}

/**
 * Checkpoint the write-ahead log once it grows past the threshold.
 *
 * `wal_checkpoint(RESTART)` is a write and `node:sqlite` runs it
 * synchronously, so it belongs on a thread that has nothing else to do.
 * @param db - the connection to checkpoint
 * @param file - the database path, used to find the WAL file
 * @returns the timer, so the caller can hand the job to another thread
 */
export function watchWalSize(db: DatabaseSync, file: string): NodeJS.Timeout {
  return setInterval(() => {
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
