import { deserialize } from 'bson';

import type { CachedMoleculeInfo, MoleculeRow } from '../MoleculeInfo.ts';

/**
 * Convert a stored row into the public molecule information.
 * @param data - the row read from the `molecules` table
 * @returns the molecule information, with the date the cache recorded it
 */
export function dbInfoToMoleculeInfo(data: MoleculeRow): CachedMoleculeInfo {
  const { atoms, ssIndex, unsaturation, idCode, createdAt, ...rest } = data;
  return {
    ...rest,
    // The column takes NUMERIC affinity, so an all-digit idCode is handed back
    // as a number and would otherwise leave here typed as a string but not be
    // one.
    idCode: String(idCode),
    unsaturation: unsaturation ?? undefined,
    atoms: deserialize(atoms),
    ssIndex: Array.from(new Int32Array(new Uint8Array(ssIndex).buffer)),
    createdAt,
  };
}
