import type { Molecule } from 'openchemlib';

import type { LookupOptions, MoleculeLookup } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { getInfoForIdCode } from './getInfoForIdCode.ts';

/**
 * Return information for a molecule, from the cache when it holds it.
 *
 * Reading the structure has already cost whichever thread called this the
 * openchemlib parse; a server reads its queries in a worker instead and calls
 * `getInfoForIdCode` directly.
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
  return getInfoForIdCode(molecule.getIDCode(), db, options);
}
