import type { CachedMoleculeInfo } from '../MoleculeInfo.ts';
import calculateMoleculeInfoFromIDCodePromise from '../calculate/calculateMoleculeInfoFromIDCodePromise.ts';

import type { DB } from './DB.ts';
import { insertInfo } from './insertInfo.ts';
import { nowSeconds } from './toDBMoleculeInfo.ts';
import { enqueueInfo } from './writeQueue.ts';

/**
 * Compute a molecule's information and store it.
 *
 * The row is handed to the writer thread rather than written here, so the
 * caller never waits on the write lock. The information comes back either
 * way: a row the queue let go is simply a molecule the cache will compute
 * again next time it is asked for.
 * @param molecule - the idCode to compute from
 * @param db - the database to write to when no writer thread is running
 * @returns the information, carrying the moment it was cached
 */
export async function insertMolecule(
  molecule: string,
  db: DB,
): Promise<CachedMoleculeInfo> {
  const { promise } = await calculateMoleculeInfoFromIDCodePromise(molecule);
  const info = await promise;
  const createdAt = nowSeconds();

  // A script and a test write for themselves; only a server has a writer.
  if (enqueueInfo(info, createdAt) === 'disabled') {
    insertInfo(info, db, createdAt);
  }

  return { ...info, createdAt };
}
