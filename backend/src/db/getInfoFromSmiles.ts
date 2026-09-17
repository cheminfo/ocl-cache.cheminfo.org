import { Molecule } from 'openchemlib';
import pino from 'pino';

import type { LookupOptions, MoleculeLookup } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { getInfoFromMolecule } from './getInfoFromMolecule.ts';

const logger = pino({ messageKey: 'getInfoFromSmiles' });

/**
 * Return information for a molecule written as SMILES.
 * @param smiles - the SMILES to look up
 * @param db - the database to read and fill
 * @param options - whether a miss may be computed and stored
 * @returns the information, and whether it came from the cache
 */
export function getInfoFromSmiles(
  smiles: string,
  db: DB,
  options: LookupOptions = {},
): Promise<MoleculeLookup> {
  logger.trace(smiles);
  const molecule = Molecule.fromSmiles(smiles);
  return getInfoFromMolecule(molecule, db, options);
}
