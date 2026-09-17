import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import calculateMoleculeInfo from '../calculate/calculateMoleculeInfo.ts';

test('getMoleculeInfo', () => {
  const molecule = Molecule.fromSmiles('CCC(=O)C[13CH3].[Cl-]');
  const info = calculateMoleculeInfo(molecule);

  expect(info).toStrictEqual({
    acceptorCount: 1,
    atoms: {
      C: 5,
      Cl: 1,
      H: 10,
      O: 1,
    },
    charge: -1,
    donorCount: 0,
    em: 122.04537245894,
    idCode: 'gOQIHH`\\`lkU@LRv@',
    logP: 1.2873999774456024,
    logS: -1.4459999836981297,
    mf: 'C4[13C]H10O.Cl(-1)',
    mw: 122.57804846949503,
    nbFragments: 2,
    noStereoID: 'gOQIHH`\\`lkU@LRv@',
    noStereoTautomerID: 'gOQIHH`\\`lmU@\\RvE\\LSBq~drUL_CGpp',
    failedTautomerID: 0,
    polarSurfaceArea: 17.06999969482422,
    rotatableBondCount: 2,
    ssIndex: [
      1938039312, 671088768, 167772192, 268435456, 16384, 128, 0, 0, 0, 0, 0, 0,
      32, 0, 0, 0,
    ],
    stereoCenterCount: 0,
    unsaturation: 2,
  });
});

test('calculateMoleculeInfo CCC', () => {
  const molecule = Molecule.fromSmiles('CCC');
  const info = calculateMoleculeInfo(molecule);

  expect(info).toStrictEqual({
    acceptorCount: 0,
    atoms: {
      C: 3,
      H: 8,
    },
    charge: 0,
    donorCount: 0,
    em: 44.06260025784,
    idCode: 'eM@Hz@',
    logP: 1.4315999746322632,
    logS: -1.2539999783039093,
    mf: 'C3H8',
    mw: 44.095733722651964,
    nbFragments: 1,
    noStereoID: 'eM@Hz@',
    noStereoTautomerID: 'eM@Hz@',
    failedTautomerID: 0,
    polarSurfaceArea: 0,
    rotatableBondCount: 0,
    ssIndex: [1082130432, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    stereoCenterCount: 0,
    unsaturation: 0,
  });
});
