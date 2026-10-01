import pino from 'pino';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { toDBMoleculeInfo } from './toDBMoleculeInfo.ts';

const logger = pino({ messageKey: 'insertInfoBatch' });

/**
 * How many rows go into one transaction.
 *
 * One autocommit insert per molecule takes and releases the write lock for
 * every row, which is what made an import of any size contend with everything
 * else touching the file. A few hundred rows per transaction amortises that
 * without holding the lock long enough to stall another writer.
 */
export const WRITE_BATCH_SIZE = 250;

/** A computed molecule waiting to be written, with the time it arrived. */
export interface PendingWrite {
  /** The computed properties. */
  info: MoleculeInfo;
  /** The insertion time to record, in unix seconds. */
  createdAt: number;
}

/**
 * Write computed molecules in transactions of at most `WRITE_BATCH_SIZE`.
 *
 * A row that cannot be written — a molecule that arrived twice, most often —
 * is logged and skipped, because SQLite rolls back the failed statement alone
 * and the rest of the batch is still good.
 *
 * This holds the write lock, synchronously: never call it from a process
 * serving requests.
 * @param writes - the rows to store
 * @param db - the database to write to
 * @returns how many rows were written
 */
export function insertInfoBatch(writes: PendingWrite[], db: DB): number {
  let written = 0;
  for (let start = 0; start < writes.length; start += WRITE_BATCH_SIZE) {
    written += insertChunk(writes.slice(start, start + WRITE_BATCH_SIZE), db);
  }
  return written;
}

/**
 * Write one chunk inside a single transaction.
 * @param chunk - at most `WRITE_BATCH_SIZE` rows
 * @param db - the database to write to
 * @returns how many rows were written
 */
function insertChunk(chunk: PendingWrite[], db: DB): number {
  if (chunk.length === 0) return 0;

  let written = 0;
  db.exec('BEGIN');
  try {
    for (const { info, createdAt } of chunk) {
      try {
        db.insertInfo.run(toDBMoleculeInfo(info, createdAt));
        written++;
      } catch (error: unknown) {
        logger.error(error, info.idCode);
      }
    }
    db.exec('COMMIT');
  } catch (error: unknown) {
    db.exec('ROLLBACK');
    throw error;
  }
  return written;
}
