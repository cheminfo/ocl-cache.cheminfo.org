import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import calculateMoleculeInfoFromIDCode from '../calculateMoleculeInfoFromIDCode.ts';

const molfile = readFileSync(join(import.meta.dirname, 'molfile.txt'), 'utf8');

test('should first', () => {
  const molecule = Molecule.fromMolfile(molfile);
  const idCode = molecule.getIDCode();
  const info = calculateMoleculeInfoFromIDCode(idCode);

  expect(info).toStrictEqual({
    acceptorCount: 0,
    atoms: {
      C: 6,
      H: 14,
    },
    charge: 0,
    donorCount: 0,
    em: 86.10955045122,
    idCode: 'gGP@DiVj`@',
    logP: 2.7947999835014343,
    logS: -2.0640000104904175,
    mf: 'C6H14',
    mw: 86.17558593719237,
    nbFragments: 1,
    noStereoID: 'gGP@DiVj`@',
    noStereoTautomerID: 'gGP@DiVj`@',
    failedTautomerID: 0,
    polarSurfaceArea: 0,
    rotatableBondCount: 3,
    ssIndex: [
      1652621312, 134217728, 33554432, 0, 16777216, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0,
    ],
    stereoCenterCount: 0,
    unsaturation: 0,
  });
});
