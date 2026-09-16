import { expect, test } from 'vitest';

import { getTempDB } from '../dbFactory.ts';
import { getInfoFromSmiles } from '../getInfoFromSmiles.ts';

test(
  'will test if data are the same with cache or without cache',
  { timeout: 30000 },
  async () => {
    const tempDB = await getTempDB();
    // first time it should store the result in the DB
    const result = await getInfoFromSmiles('CCOCC', tempDB);

    const expected = {
      idCode: 'gJQ@@eKU@@',
      mf: 'C4H10O',
      em: 74.07316494187,
      mw: 74.12175605181704,
      nbFragments: 1,
      charge: 0,
      noStereoID: 'gJQ@@eKU@@',
      noStereoTautomerID: 'gJQ@@eKU@@',
      failedTautomerID: 0,
      logS: -0.9049999713897705,
      logP: 0.8846999406814575,
      acceptorCount: 1,
      donorCount: 0,
      rotatableBondCount: 2,
      stereoCenterCount: 0,
      polarSurfaceArea: 9.229999542236328,
      ssIndex: [
        -95943616, 512, 1048576, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      unsaturation: 0,
      atoms: { C: 4, H: 10, O: 1 },
    };

    expect(result).toStrictEqual(expected);

    const result2 = await getInfoFromSmiles('CCOCC', tempDB);

    expect(result2).toStrictEqual(expected);
  },
);
