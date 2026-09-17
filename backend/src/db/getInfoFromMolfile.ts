import { Molecule } from 'openchemlib';

import type { LookupOptions, MoleculeLookup } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { getInfoFromMolecule } from './getInfoFromMolecule.ts';

/**
 * Return information for a molecule written as a molfile.
 * @param molfile - molfile of the molecule
 * @param db - the database to read and fill
 * @param options - whether a miss may be computed and stored
 * @returns the information, and whether it came from the cache
 */
export function getInfoFromMolfile(
  molfile: string,
  db: DB,
  options: LookupOptions = {},
): Promise<MoleculeLookup> {
  const molecule = Molecule.fromMolfile(molfile);
  return getInfoFromMolecule(molecule, db, options);
}
