import { Molecule } from 'openchemlib';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { getInfoFromMolecule } from './getInfoFromMolecule.ts';

/**
 * Return information for a molecule from its molfile
 * @param molfile - molfile of the molecule
 * @param db
 * @returns
 */
export function getInfoFromMolfile(
  molfile: string,
  db: DB,
): Promise<MoleculeInfo> {
  const molecule = Molecule.fromMolfile(molfile);
  return getInfoFromMolecule(molecule, db);
}
