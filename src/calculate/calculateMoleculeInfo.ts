import { MF } from 'mass-tools';
import type { Molecule } from 'openchemlib';
import { MoleculeProperties } from 'openchemlib';
import { getMF } from 'openchemlib-utils';
import pino from 'pino';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

const logger = pino({ name: 'calculateMoleculeInfo' });

/**
 * Calculate information for a molecule from an instance of OCL Molecule
 * @param molecule - instance of OCL Molecule
 * @param options - options
 * @param options.ignoreTautomer
 * @returns
 */
export default function calculateMoleculeInfo(
  molecule: Molecule,
  options: { ignoreTautomer?: boolean } = {},
): MoleculeInfo {
  const { ignoreTautomer = false } = options;

  // @ts-expect-error - parts is not defined in the type and it should be fixed in mf
  const mf = getMF(molecule).parts.toSorted().join('.');
  const mfInfo = new MF(mf).getInfo();

  const idCode = molecule.getIDCode();
  const noStereoID = getNoStereoIDCode(molecule);

  const info: MoleculeInfo = {
    mf: mfInfo.mf,
    mw: mfInfo.mass,
    em: mfInfo.monoisotopicMass,
    charge: mfInfo.charge,
    atoms: mfInfo.atoms,
    unsaturation: mfInfo.unsaturation,
    idCode,
    noStereoID,
    ...getNoStereoTautomerIfSmall(mfInfo, molecule, noStereoID, ignoreTautomer),
    ...getProperties(molecule),
    ssIndex: getSSIndex(molecule),
  };

  return info;
}

function getNoStereoIDCode(molecule: Molecule): string {
  molecule.stripStereoInformation();
  return molecule.getIDCode();
}

function getNoStereoTautomerIDCode(molecule: Molecule): string {
  const OCL = molecule.getOCL();
  return OCL.CanonizerUtil.getIDCode(
    molecule,
    OCL.CanonizerUtil.NOSTEREO_TAUTOMER,
  );
}

function getSSIndex(molecule: Molecule): number[] {
  // remove some other properties present in the index
  return [...molecule.getIndex()];
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

function getNoStereoTautomerIfSmall(
  mfInfo: any,
  molecule: Molecule,
  noStereoID: string,
  ignoreTautomer: boolean,
): { noStereoTautomerID: string; failedTautomerID: 0 | 1 } {
  if (ignoreTautomer) {
    logger.trace(`Ignore tautomer: ${mfInfo.mf}, ${molecule.getIDCode()}`);
    return { noStereoTautomerID: noStereoID, failedTautomerID: 1 };
  }

  let small = true;
  if (mfInfo.atoms) {
    if (mfInfo.atoms.C > 50) small = false;
  } else if (mfInfo.parts) {
    for (const part of mfInfo.parts) {
      if (part.atoms.C > 50) small = false;
    }
  }

  if (small) {
    return {
      noStereoTautomerID: getNoStereoTautomerIDCode(molecule),
      failedTautomerID: 0,
    };
  } else {
    logger.trace(`Too big: ${mfInfo.mf}, ${molecule.getIDCode()}`);
    return { noStereoTautomerID: noStereoID, failedTautomerID: 1 };
  }
}
