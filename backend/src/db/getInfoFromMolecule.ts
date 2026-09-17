import type { Molecule } from 'openchemlib';
import pino from 'pino';

import type { LookupOptions, MoleculeLookup } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { dbInfoToMoleculeInfo } from './dbInfoToMoleculeInfo.ts';
import { insertMolecule } from './insertMolecule.ts';

const logger = pino({ messageKey: 'getInfoFromMolecule' });

/**
 * Return information for a molecule, from the cache when it holds it.
 * @param molecule - instance of OCL Molecule
 * @param db - the database to read and fill
 * @param options - whether a miss may be computed and stored
 * @returns the information, and whether it came from the cache
 */
export async function getInfoFromMolecule(
  molecule: Molecule,
  db: DB,
  options: LookupOptions = {},
): Promise<MoleculeLookup> {
  const idCode = molecule.getIDCode();
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
