import { Molecule } from 'openchemlib';
import pino from 'pino';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';
import { getInfoFromMolecule } from './getInfoFromMolecule.ts';

const logger = pino({ messageKey: 'getInfoFromSmiles' });
export function getInfoFromSmiles(
  smiles: string,
  db: DB,
): Promise<MoleculeInfo> {
  logger.trace(smiles);
  const molecule = Molecule.fromSmiles(smiles);
  return getInfoFromMolecule(molecule, db);
}
