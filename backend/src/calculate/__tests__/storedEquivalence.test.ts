import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Molecule, MoleculeProperties } from 'openchemlib';
import { getIndex } from 'openchemlib-search-wasm';
import { expect, test } from 'vitest';

// 250 real drug-like idCodes. The point of a real corpus here is that the two
// properties below are claims about the 150 million rows already stored, and a
// handful of hand-picked molecules cannot support them.
const idCodes = readFileSync(join(import.meta.dirname, 'idcodes.txt'), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

// Both corpus tests carry an explicit timeout: they run two openchemlib
// implementations over 250 real molecules, which is seconds rather than the
// 5 s vitest allows by default, and the whole point is to use a corpus large
// enough to support a claim about 150 million stored rows.

/** The property columns the calculation writes, read off a molecule. */
const PROPERTY_KEYS = [
  'logS',
  'logP',
  'acceptorCount',
  'donorCount',
  'rotatableBondCount',
  'stereoCenterCount',
  'polarSurfaceArea',
] as const;

test('the fixture is a real corpus, not a token one', () => {
  expect(idCodes).toHaveLength(250);
});

test(
  'the fingerprint now stored is bit-identical to the one already stored',
  { timeout: 60_000 },
  () => {
    // Every row in the cache got its `ssIndex` from openchemlib-js, applied to a
    // molecule that had been stereo-stripped in place. The fingerprint is now
    // built by openchemlib-search-wasm from the idCode instead — 4.8x faster — and
    // the eight ssIndexN columns back a composite index that a substructure
    // screen will read across old and new rows alike. If the two implementations
    // disagreed on even one molecule, the index would be silently inconsistent and
    // the screen would miss real hits with nothing to show why.
    const differing: string[] = [];
    for (const idCode of idCodes) {
      const stored = Molecule.fromIDCode(idCode);
      stored.stripStereoInformation();
      const before = [...stored.getIndex()];
      const after = [...getIndex(idCode)];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        differing.push(idCode);
      }
    }

    expect(differing).toStrictEqual([]);
  },
);

test(
  'dropping the in-place stereo strip left every property column unchanged',
  { timeout: 60_000 },
  () => {
    // The old calculation stripped stereochemistry from the molecule before
    // computing its properties, so every stored logP, surface area and
    // stereocentre count was measured on a stripped molecule. The keys no longer
    // need that mutation, so the properties are now computed on the molecule as
    // parsed. These counts are what a row holds, so they must not move.
    const differing: string[] = [];
    for (const idCode of idCodes) {
      const stripped = Molecule.fromIDCode(idCode);
      stripped.stripStereoInformation();
      const before = new MoleculeProperties(stripped);
      const beforeFragments = stripped.getFragmentNumbers([], false, false);

      const intact = Molecule.fromIDCode(idCode);
      const after = new MoleculeProperties(intact);
      const afterFragments = intact.getFragmentNumbers([], false, false);

      const moved =
        beforeFragments !== afterFragments ||
        PROPERTY_KEYS.some((key) => before[key] !== after[key]);
      if (moved) differing.push(idCode);
    }

    expect(differing).toStrictEqual([]);
  },
);
