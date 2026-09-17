import { Molecule } from 'openchemlib';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import calculateMoleculeInfo from './calculateMoleculeInfo.ts';

export default function calculateMoleculeInfoFromIDCode(
  idCode: string,
  options: { ignoreTautomer?: boolean } = {},
): MoleculeInfo {
  const info = calculateMoleculeInfo(Molecule.fromIDCode(idCode), options);
  // surprisingly in some cases the idCode is not 'stable' and if we recreate the idCode we don't obtain the same code
  info.idCode = idCode;

  return info;
}
