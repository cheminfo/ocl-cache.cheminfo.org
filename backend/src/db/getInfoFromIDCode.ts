import pino from 'pino';

import type { LookupOptions, MoleculeLookup } from '../MoleculeInfo.ts';

import { getDB } from './dbFactory.ts';
import { dbInfoToMoleculeInfo } from './dbInfoToMoleculeInfo.ts';
import { insertMolecule } from './insertMolecule.ts';

const logger = pino({ messageKey: 'getInfoFromIDCode' });

/**
 * Return information for a molecule from its idCode.
 * @param idCode - idCode of the molecule
 * @param options - whether a miss may be computed and stored
 * @returns the information, and whether it came from the cache
 */
export async function getInfoFromIDCode(
  idCode: string,
  options: LookupOptions = {},
): Promise<MoleculeLookup> {
  const db = await getDB();
  const resultFromDB = db.searchIDCode.get(idCode);
  if (resultFromDB) {
    logger.trace('in cache');
    return { info: dbInfoToMoleculeInfo(resultFromDB), cached: true };
  }
  if (options.cacheOnly) {
    return { info: null, cached: false };
  }
  return { info: await insertMolecule(idCode, db), cached: false };
}
