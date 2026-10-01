import { Molecule } from 'openchemlib';
import {
  getNoStereoHash,
  getNoStereoIdCode,
  getNoStereoTautomerHash,
  strongHash,
} from 'openchemlib-search-wasm';
import { expect, test } from 'vitest';

import { MAX_TAUTOMERS, structureKeys } from '../structureKeys.ts';

const idCodeOf = (smiles: string) => Molecule.fromSmiles(smiles).getIDCode();

test('the canonical forms are the ones the hashes are defined over', () => {
  // The forms stored here and the hashes `openchemlib-sqlite` stores for the
  // same molecule have to agree, and every CanonizerUtil hash is defined as
  // OpenChemLib's hasher over exactly these idCodes. Hashing them is how that
  // agreement is checked without storing a hash.
  const idCode = idCodeOf('N[C@@H](C)C(=O)O');
  const keys = structureKeys(idCode);

  expect(strongHash(keys.noStereoID)).toBe(getNoStereoHash(idCode));
  expect(strongHash(keys.noStereoTautomerID)).toBe(
    getNoStereoTautomerHash(idCode, { maxTautomers: MAX_TAUTOMERS }),
  );
});

test('the two enantiomers of 2-chlorobutane share both forms', () => {
  const left = structureKeys(idCodeOf('CC[C@@H](C)Cl'));
  const right = structureKeys(idCodeOf('CC[C@H](C)Cl'));

  expect(left.noStereoID).toBe(right.noStereoID);
  expect(left.noStereoTautomerID).toBe(right.noStereoTautomerID);
});

test('a keto and its enol share the tautomer form but not the no-stereo one', () => {
  const keto = structureKeys(idCodeOf('CC(=O)CC(=O)C'));
  const enol = structureKeys(idCodeOf('CC(O)=CC(=O)C'));

  expect(keto.noStereoTautomerID).toBe(enol.noStereoTautomerID);
  expect(keto.noStereoID).not.toBe(enol.noStereoID);
  expect(keto.failedTautomerID).toBe(0);
});

test('a molecule drawn without its double-bond stereo keys as one drawn with it', () => {
  // This is the defect openchemlib-search-wasm 2.0.0 fixed, and the reason the
  // stored forms are worth rebuilding: stripping stereo from the molecule turned
  // an unconfigured double bond into E, so the same compound keyed two ways
  // depending on how it had been drawn.
  const unconfigured = structureKeys(idCodeOf('CC=CC'));
  const configured = structureKeys(idCodeOf('C/C=C/C'));

  expect(unconfigured.noStereoID).toBe(configured.noStereoID);
});

test('the form stored by the route this replaced is the same form', () => {
  // This is why no stored row has to be rewritten, and it is worth a test
  // because the opposite is easy to assume: openchemlib-search-wasm 2.0.0
  // changed these values for a caller that strips stereo from a molecule
  // carrying no coordinates. The route this replaced parsed with
  // `Molecule.fromIDCode(idCode)`, which invents them, and with coordinates the
  // two agree — over the 250-molecule corpus in this directory as well.
  for (const smiles of [
    'CC=CC',
    'C/C=C/C',
    'ClC=CCl',
    'N[C@@H](C)C(=O)O',
    'O[C@@H]1CCCC[C@@H]1O',
    'CC(=O)C=CC(=O)O',
  ]) {
    const idCode = idCodeOf(smiles);
    const asStored = Molecule.fromIDCode(idCode);
    asStored.stripStereoInformation();

    expect(getNoStereoIdCode(idCode)).toBe(asStored.getIDCode());
  }
});

test('without coordinates the two routes do diverge, which is why we canonize', () => {
  // The wasm parses an idCode without inventing coordinates — 20x cheaper than
  // the parse — and stripping stereo from such a molecule cannot turn a stereo
  // bond, so the canonizer assigns a configuration instead of dropping one.
  // Disregarding stereo in the canonizer is what avoids that, and it is the
  // whole reason this module does not strip.
  const idCode = idCodeOf('N[C@@H](C)C(=O)O');
  const withoutCoordinates = Molecule.fromIDCode(idCode, false);
  withoutCoordinates.stripStereoInformation();

  expect(getNoStereoIdCode(idCode)).not.toBe(withoutCoordinates.getIDCode());
});

test('ignoring the tautomer stands the no-stereo form in and flags it', () => {
  const keys = structureKeys(idCodeOf('CC(=O)CC(=O)C'), true);

  expect(keys.failedTautomerID).toBe(1);
  expect(keys.noStereoTautomerID).toBe(keys.noStereoID);
});

test('an idCode no molecule can be read from gets no form at all', () => {
  for (const unreadable of ['', 'zzzz', '####']) {
    const keys = structureKeys(unreadable);

    expect(keys.noStereoID).toBe('');
    expect(keys.failedTautomerID).toBe(1);
  }
});

test('a string that happens to be a valid idCode is keyed, not rejected', () => {
  // 'not-an-idcode' is spelled in OpenChemLib's idCode alphabet and reads as a
  // real molecule, so it gets real forms. Only a string OCL cannot read gets none.
  const keys = structureKeys('not-an-idcode');

  expect(keys.noStereoID).not.toBe('');
  expect(keys.failedTautomerID).toBe(0);
});
