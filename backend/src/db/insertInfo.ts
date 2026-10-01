import pino from 'pino';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { nowSeconds, toDBMoleculeInfo } from './toDBMoleculeInfo.ts';

const logger = pino({ messageKey: 'insertInfo' });

/**
 * Store one molecule's computed information.
 *
 * This takes the write lock for the duration of its own transaction, which
 * `node:sqlite` holds synchronously: never call it from a process serving
 * requests. A server enqueues the row instead — see `writeQueue.ts`.
 * @param info - the computed properties
 * @param db - the database to write to
 * @param createdAt - the insertion time to record, in unix seconds
 * @returns the insertion time written with the row, in unix seconds
 */
export function insertInfo(
  info: MoleculeInfo,
  db: DB,
  createdAt: number = nowSeconds(),
): number {
  try {
    db.insertInfo.run(toDBMoleculeInfo(info, createdAt));
  } catch (error: unknown) {
    logger.error(error, info.idCode);
  }

  return createdAt;
}
