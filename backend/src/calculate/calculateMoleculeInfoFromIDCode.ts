import { Molecule } from 'openchemlib';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import calculateMoleculeInfo from './calculateMoleculeInfo.ts';

export default function calculateMoleculeInfoFromIDCode(
  idCode: string,
  options: { ignoreTautomer?: boolean } = {},
): MoleculeInfo {
  // The idCode is handed on rather than re-derived: in some cases it is not
  // stable, and recreating it from the Molecule does not give the same string.
  // Every key the row is found by has to come from the one the row stores.
  return calculateMoleculeInfo(Molecule.fromIDCode(idCode), {
    ...options,
    idCode,
  });
}
