import type { CachedMoleculeInfo } from '../MoleculeInfo.ts';
import calculateMoleculeInfoFromIDCodePromise from '../calculate/calculateMoleculeInfoFromIDCodePromise.ts';

import type { DB } from './DB.ts';
import { insertInfo } from './insertInfo.ts';

/**
 * Compute a molecule's information and store it.
 * @param molecule - the idCode to compute from
 * @param db - the database to write to
 * @returns the information, carrying the moment it was cached
 */
export async function insertMolecule(
  molecule: string,
  db: DB,
): Promise<CachedMoleculeInfo> {
  const { promise } = await calculateMoleculeInfoFromIDCodePromise(molecule);
  const info = await promise;
  const createdAt = insertInfo(info, db);

  return { ...info, createdAt };
}
