import { deserialize } from 'bson';

import type { MoleculeInfo, MoleculeRow } from '../MoleculeInfo.ts';

/**
 * Convert a stored row into the public molecule information.
 * @param data - the row read from the `molecules` table
 * @returns the molecule information
 */
export function dbInfoToMoleculeInfo(data: MoleculeRow): MoleculeInfo {
  const { atoms, ssIndex, unsaturation, ...rest } = data;
  return {
    ...rest,
    unsaturation: unsaturation ?? undefined,
    atoms: deserialize(atoms),
    ssIndex: Array.from(new Int32Array(new Uint8Array(ssIndex).buffer)),
  };
}
