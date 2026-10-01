import { MF } from 'mass-tools';
import type { Molecule } from 'openchemlib';
import { MoleculeProperties } from 'openchemlib';
import { getIndex } from 'openchemlib-search-wasm';
import { getMF } from 'openchemlib-utils';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import { structureKeys } from './structureKeys.ts';

/**
 * Calculate information for a molecule from an instance of OCL Molecule
 * @param molecule - instance of OCL Molecule
 * @param options - options
 * @param options.ignoreTautomer - skip the generic tautomer key
 * @param options.idCode - the idCode the row will store, when the caller holds
 *   it. The round trip through a Molecule is not always stable, so the keys must
 *   be derived from the same string the row is found by, not from a re-encoding
 *   of it.
 * @returns
 */
export default function calculateMoleculeInfo(
  molecule: Molecule,
  options: { ignoreTautomer?: boolean; idCode?: string } = {},
): MoleculeInfo {
  const { ignoreTautomer = false, idCode = molecule.getIDCode() } = options;

  // @ts-expect-error - parts is not defined in the type and it should be fixed in mf
  const mf = getMF(molecule).parts.toSorted().join('.');
  const mfInfo = new MF(mf).getInfo();

  const info: MoleculeInfo = {
    mf: mfInfo.mf,
    mw: mfInfo.mass,
    em: mfInfo.monoisotopicMass,
    charge: mfInfo.charge,
    atoms: mfInfo.atoms,
    unsaturation: mfInfo.unsaturation,
    idCode,
    ...structureKeys(idCode, ignoreTautomer),
    ...getProperties(molecule),
    ssIndex: getSSIndex(idCode),
  };

  return info;
}

/**
 * The 512-bit FragFp, as the sixteen words the row stores.
 *
 * Built from the idCode by `openchemlib-search-wasm` rather than from the
 * Molecule by `openchemlib`: measured on this corpus at 449 µs against 2171 µs,
 * and it is the most expensive thing computing a row does. The words are the
 * same, bit for bit, so a row written either way screens identically.
 * @param idCode - the molecule to fingerprint
 * @returns the sixteen words
 */
function getSSIndex(idCode: string): number[] {
  return [...getIndex(idCode)];
}

function getProperties(molecule: Molecule) {
  const moleculeProperties = new MoleculeProperties(molecule);
  const fragmentMap: number[] = [];
  const nbFragments = molecule.getFragmentNumbers(fragmentMap, false, false);

  return {
    logS: moleculeProperties.logS,
    logP: moleculeProperties.logP,
    acceptorCount: moleculeProperties.acceptorCount,
    donorCount: moleculeProperties.donorCount,
    rotatableBondCount: moleculeProperties.rotatableBondCount,
    stereoCenterCount: moleculeProperties.stereoCenterCount,
    polarSurfaceArea: moleculeProperties.polarSurfaceArea,
    nbFragments,
  };
}
