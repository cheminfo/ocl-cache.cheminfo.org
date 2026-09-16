import pino from 'pino';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import { getDB } from './dbFactory.ts';
import { dbInfoToMoleculeInfo } from './dbInfoToMoleculeInfo.ts';
import { insertMolecule } from './insertMolecule.ts';

const logger = pino({ messageKey: 'getInfoFromIDCode' });
/**
 * Return information for a molecule from its idCode
 * @param idCode - idCode of the molecule
 * @returns
 */
export async function getInfoFromIDCode(idCode: string): Promise<MoleculeInfo> {
  const db = await getDB();
  const resultFromDB = db.searchIDCode.get(idCode);
  if (resultFromDB) {
    logger.trace('in cache');
    return dbInfoToMoleculeInfo(resultFromDB);
  }
  return insertMolecule(idCode, db);
}
