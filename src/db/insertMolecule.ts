import type { MoleculeInfo } from '../MoleculeInfo.ts';
import calculateMoleculeInfoFromIDCodePromise from '../calculate/calculateMoleculeInfoFromIDCodePromise.ts';

import type { DB } from './DB.ts';
import { insertInfo } from './insertInfo.ts';

export async function insertMolecule(
  molecule: string,
  db: DB,
): Promise<MoleculeInfo> {
  const { promise } = await calculateMoleculeInfoFromIDCodePromise(molecule);
  const info = await promise;
  insertInfo(info, db);

  return info;
}
