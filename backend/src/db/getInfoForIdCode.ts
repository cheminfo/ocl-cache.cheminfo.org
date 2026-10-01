import pino from 'pino';

import type { LookupOptions, MoleculeLookup } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { dbInfoToMoleculeInfo } from './dbInfoToMoleculeInfo.ts';
import { insertMolecule } from './insertMolecule.ts';

const logger = pino({ messageKey: 'getInfoForIdCode' });

/**
 * Read a molecule out of the cache, computing it when it is not there.
 *
 * The read is an indexed lookup of a single row — about ten microseconds —
 * which is cheap enough to do on the thread serving the request. Everything
 * either side of it is not: the query was read into this idCode by a worker,
 * and a miss is computed by one.
 *
 * It probes the idCode, which is the table's primary key and therefore already
 * the best plan SQLite has. A 64-bit hash column was measured against it and
 * made no difference: `WHERE hash = ? AND idCode = ?` never uses the hash index,
 * because a unique index on the idCode already promises at most one row.
 * @param idCode - the canonical idCode to look up
 * @param db - the database to read
 * @param options - whether a miss may be computed and stored
 * @returns the information, and whether it came from the cache
 */
export async function getInfoForIdCode(
  idCode: string,
  db: DB,
  options: LookupOptions = {},
): Promise<MoleculeLookup> {
  const row = db.searchIDCode.get(idCode);
  if (row) {
    logger.trace('in cache');
    return { info: dbInfoToMoleculeInfo(row), cached: true };
  }
  if (options.cacheOnly) {
    return { info: null, cached: false };
  }
  return { info: await insertMolecule(idCode, db), cached: false };
}
