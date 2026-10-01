import type { LookupOptions, MoleculeLookup } from '../MoleculeInfo.ts';

import { getDB } from './dbFactory.ts';
import { getInfoForIdCode } from './getInfoForIdCode.ts';

/**
 * Return information for a molecule from its idCode.
 * @param idCode - idCode of the molecule
 * @param options - whether a miss may be computed and stored
 * @returns the information, and whether it came from the cache
 */
export async function getInfoFromIDCode(
  idCode: string,
  options: LookupOptions = {},
): Promise<MoleculeLookup> {
  return getInfoForIdCode(idCode, await getDB(), options);
}
