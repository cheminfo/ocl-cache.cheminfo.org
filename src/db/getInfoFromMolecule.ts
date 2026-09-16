import type { Molecule } from 'openchemlib';
import pino from 'pino';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { dbInfoToMoleculeInfo } from './dbInfoToMoleculeInfo.ts';
import { insertMolecule } from './insertMolecule.ts';

const logger = pino({ messageKey: 'getInfoFromMolecule' });

/**
 * Return information for a molecule from an instance of OCL Molecule
 * @param molecule - instance of OCL Molecule
 * @param db
 * @returns
 */
export async function getInfoFromMolecule(
  molecule: Molecule,
  db: DB,
): Promise<MoleculeInfo> {
  const idCode = molecule.getIDCode();
  const resultFromDB = db.searchIDCode.get(idCode);

  if (resultFromDB) {
    logger.trace('in cache');
    return dbInfoToMoleculeInfo(resultFromDB);
  }
  return insertMolecule(idCode, db);
}
